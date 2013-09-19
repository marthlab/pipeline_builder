function AbstractFocalGraph(pipeline, subclass_init) {
  this.pipeline = pipeline;
  this.nodes = [];
  this.edges = [];

  subclass_init.call(this);

  _(this.nodes).pushArray(this.outbound_datum_nodes);

  this.dest_nodes = _.flatten(_.map(this.outbound_datum_nodes, function(od_node){
    var dest_tasks =  this.pipeline.getTasksAssignedDatum(od_node.outbound_datum);
    return _.map(dest_tasks, function(task){return new FocalDestNode(this, od_node.outbound_datum, task)}, this);
  }, this), true);
  this.potential_dest_nodes = _.flatten(_.map(this.outbound_datum_nodes, function(od_node){
    var potential_dest_tools = app.tool_library.getToolsAcceptingFileExt(od_node.outbound_datum.getFileExt() );
    return _.map(potential_dest_tools, function(tool){return new FocalPotentialDestNode(this, od_node.outbound_datum, tool);}, this);
  }, this), true);
  this.potential_dest_group_nodes = _.map(_.filter(this.outbound_datum_nodes, function(o_data_node) {
    return _.some(this.potential_dest_nodes, {outbound_datum: o_data_node.outbound_datum});
  }, this), function(od_node) {return new FocalPotentialDestGroupNode(this, od_node.outbound_datum);}, this);

  _(this.nodes).pushArray(_.union(this.dest_nodes, this.potential_dest_nodes, this.potential_dest_group_nodes));

  this.outbound_datum_to_dest_edges = _.map(this.dest_nodes, function(o_dest_node){
    return new FocalEdge({
      graph: this,
      source: _.findExact(this.outbound_datum_nodes, {outbound_datum: o_dest_node.outbound_datum}),
      target: o_dest_node
    });
  }, this);
  this.outbound_datum_to_potential_dest_group_edges = _.map(this.potential_dest_group_nodes, function(o_pot_group_node){
    return new FocalEdge({
      graph: this,
      source: _.findExact(this.outbound_datum_nodes, {outbound_datum: o_pot_group_node.outbound_datum}),
      target: o_pot_group_node
    });
  }, this);
  this.potential_dest_group_to_potential_dest_edges = _.map(this.potential_dest_nodes, function(o_pot_dest_node){
    return new FocalEdge({
      graph: this,
      source: _.findExact(this.potential_dest_group_nodes, {outbound_datum: o_pot_dest_node.outbound_datum}),
      target: o_pot_dest_node
    });
  }, this);

  _(this.edges).pushArray(_.union(
    this.outbound_datum_to_dest_edges,
    this.outbound_datum_to_potential_dest_group_edges,
    this.potential_dest_group_to_potential_dest_edges
  ));

}
_.extend(AbstractFocalGraph.prototype, {

});

function FocalTaskGraph(task) {
  AbstractFocalGraph.call(this, task.pipeline, function(){
    this.task = task;

    this.task_node = new FocalTaskNode(this, this.task);
    this.task_input_nodes = _.map(this.task.inputs, function(task_input){return new FocalTaskInputNode(this, task_input);}, this);
    this.task_input_src_nodes = _.map(_.methodFilter(this.task.inputs, 'isAssigned'), function(task_input){return new FocalTaskInputSrcNode(this, task_input);}, this);
    this.task_input_potential_src_nodes = _.map(_.methodReject(this.task.inputs, 'isAssigned'), function(task_input){return new FocalTaskInputPotentialSrcNode(this, task_input);}, this);
    this.outbound_datum_nodes = _.map(this.task.outputs, function(task_output){return new FocalOutboundDatumNode(this, task_output);}, this);

    _(this.nodes).pushArray(_.union([this.task_node], this.task_input_nodes, this.task_input_src_nodes, this.task_input_potential_src_nodes));

    this.task_input_to_task_edges = _.map(this.task_input_nodes, function(ti_node){
      return new FocalEdge({
        graph: this,
        source: ti_node,
        target: this.task_node
      });
    }, this); 
    this.task_input_source_to_task_input_edges = _.map(this.task_input_src_nodes, function(tis_node){
      return new FocalEdge({
        graph: this,
        source: tis_node,
        target: _.findExact(this.task_input_nodes, {task_input: tis_node.task_input})
      });
    }, this);
    this.task_input_potential_src_to_task_input_edges = _.map(this.task_input_potential_src_nodes, function(tips_node){
      return new FocalEdge({
        graph: this,
        source: tips_node,
        target: _.findExact(this.task_input_nodes, {task_input: tips_node.task_input})
      });
    }, this);
    this.task_to_outbound_datum_edges = _.map(this.outbound_datum_nodes, function(od_node){
      return new FocalEdge({
        graph: this,
        source: this.task_node,
        target: od_node
      });
    }, this);

    _(this.edges).pushArray(_.union(this.task_input_to_task_edges, this.task_input_source_to_task_input_edges, this.task_input_potential_src_to_task_input_edges, this.task_to_outbound_datum_edges));
  });
//debugger;
}
FocalTaskGraph.prototype = _.extend(Object.create(AbstractFocalGraph.prototype), {
  constructor: FocalTaskGraph
});

function FocalInputsGraph(pipeline) {
  AbstractFocalGraph.call(this, pipeline, function(){
    this.outbound_datum_nodes = _.map(this.pipeline.inputs, function(pl_input){return new FocalOutboundDatumNode(this, pl_input);}, this);
  });
}
FocalInputsGraph.prototype = _.extend(Object.create(AbstractFocalGraph.prototype), {
  constructor: FocalInputsGraph
});

var abstract_focal_node = {};

function FocalTaskInputNode(graph, task_input) {
  this.graph = graph;
  this.task_input = task_input;
  this.label = 'test' ;//this.task_input.tool_input.id;
}
FocalTaskInputNode.prototype = _.extend(abstract_focal_node, {
  constructor: FocalInputsGraph
});

function FocalTaskInputSrcNode(graph, task_input) {
  this.graph = graph;
  this.task_input = task_input;
  this.label = 'test' ;// this.task_input.src.getLabel();
}
FocalTaskInputSrcNode.prototype = _.extend(abstract_focal_node, {
  constructor: FocalInputsGraph
});

function FocalTaskNode(graph, task) {
  this.graph = graph;
  this.task = task;
  this.label = this.task.tool.id;
}
FocalTaskNode.prototype = _.extend(abstract_focal_node, {
  constructor: FocalInputsGraph
});

function FocalTaskInputPotentialSrcNode(graph, task_input) {
  this.graph = graph;
  this.task_input = task_input;
  this.label = "Select Data Source";
}
FocalTaskInputPotentialSrcNode.prototype = _.extend(abstract_focal_node, {
  constructor: FocalInputsGraph
});

function FocalOutboundDatumNode(graph, outbound_datum) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
  this.label = this.outbound_datum.getLabel();
}
FocalOutboundDatumNode.prototype = _.extend(abstract_focal_node, {
  constructor: FocalInputsGraph
});

function FocalDestNode(graph, outbound_datum, dest) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
  this.dest = dest;
  this.label = this.dest.tool.id;
}
FocalDestNode.prototype = _.extend(abstract_focal_node, {
  constructor: FocalInputsGraph
});

function FocalPotentialDestNode(graph, outbound_datum, potential_dest) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
  this.potential_dest = potential_dest;
  this.label = this.potential_dest.id;
}
FocalPotentialDestNode.prototype = _.extend(abstract_focal_node, {
  constructor: FocalInputsGraph
});

function FocalPotentialDestGroupNode(graph, outbound_datum) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
  this.label = 'Add New Task'
}
FocalPotentialDestGroupNode.prototype = _.extend(abstract_focal_node, {
  constructor: FocalInputsGraph
});

function FocalEdge(options) {
  this.graph = options.graph;
  this.source = options.source;
  this.target = options.target;
}
_.extend(FocalEdge.prototype, {

});