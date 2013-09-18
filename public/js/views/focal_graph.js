function FocalGraph(pipeline, subclass_init) {
  this.pipeline = pipeline;
  this.nodes = [];
  this.edges = [];

  subclass_init.call(this);

  _(this.nodes).pushArray(this.outbound_datum_nodes);

  this.dest_nodes = _.flatten(_.map(this.outbound_datum_nodes, function(o_data_node){
    var dest_tasks =  this.pipeline.getTasksAssignedDatum(o_data_node.output_datum);
    return _.map(dest_tasks, function(task){return new FocalDestNode(this, o_data_node.output_datum, task)}, this);
  }, this), true);
  this.potential_dest_nodes = _.flatten(_.map(this.outbound_datum_nodes, function(o_data_node){
    var potential_dest_tools = tool_library.getToolsAcceptingFileExt(o_data_node.outbound_datum.getFileExt() );
    return _.map(potential_dest_tools, function(tool){return new FocalPotentialDestNode(this, o_data_node.output_datum, tool);}, this);
  }, this), true);
  this.potential_dest_group_nodes = _.map(_.filter(this.outbound_datum_nodes, function(o_data_node) {
    return _.some(this.potential_dest_nodes, {outbound_datum: o_data_node.outbound_datum});
  }, this), function(o_data_node) {return new FocalPotentialDestGroupNode(this, o_data_node.output_datum);}, this);

  _(this.nodes).pushArray(_.union(this.dest_nodes, this.potential_dest_nodes, this.potential_dest_group_nodes));

  this.task_to_outbound_datum_edges = _.map(this.outbound_datum_nodes, function(od_node){
    return new FocalEdge({
      graph: this,
      source: this.task_node,
      target: od_node
    });
  }, this);
  this.outbound_datum_to_dest_edges = _.map(this.dest_nodes, function(o_dest_node){
    return new FocalEdge({
      graph: this,
      source: _.find(this.outbound_datum_nodes, {outbound_datum: o_dest_node.outbound_datum}),
      target: o_dest_node
    });
  }, this);
  this.outbound_datum_to_potential_dest_group_edges = _.map(this.potential_dest_nodes, function(o_pot_group_node){
    return new FocalEdge({
      graph: this,
      source: _.find(this.outbound_datum_nodes, {outbound_datum: o_pot_group_node.outbound_datum}),
      target: o_pot_group_node
    });
  }, this);
  this.potential_dest_group_to_potential_dest_edges = _.map(this.potential_dest_nodes, function(o_pot_dest_node){
    return new FocalEdge({
      graph: this,
      source: _.find(this.potential_dest_group_nodes, {outbound_datum: o_pot_dest_node.outbound_datum}),
      target: o_pot_dest_node
    });
  }, this);

  _(this.edges).pushArray(_.union(
    this.task_to_outbound_datum_edges,
    this.outbound_datum_to_dest_edges,
    this.outbound_datum_to_potential_dest_group_edges,
    this.potential_dest_group_to_potential_dest_edges
  ));
}
_.extend(FocalGraph.prototype, {

});

function FocalTaskGraph(pipeline, task) {
  FocalGraph.call(this, pipeline, function(){
    this.task = task;

    this.task_node = new FocalTaskNode(this, this.task);
    this.task_input_nodes = _.map(this.task.task_inputs, function(task_input){return new FocalTaskInputNode(this, task_input);}, this);
    this.task_input_src_nodes = _.map(_.filter(this.task.task_inputs, 'src'), function(task_input){return new FocalTaskInputSrcNode(this, task_input);}, this);
    this.task_input_potential_src_nodes = _.map(_.reject(this.task.task_inputs, 'src'), function(task_input){return new FocalTaskInputPotentialSrcNode(this, task_input);}, this);
    this.outbound_datum_nodes = _.map(this.task.task_outputs, function(task_output){return new FocalOutboundDatumNode(this, task_output);}, this);

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
        target: _.find(this.task_input_nodes, {task_input: tis_node.task_input})
      });
    }, this);
    this.task_input_potential_source_to_task_input_edges = _.map(this.task_input_potential_src_nodes, function(tips_node){
      return new FocalEdge({
        graph: this,
        source: tips_node,
        target: _.find(this.task_input_nodes, {task_input: tips_node.task_input})
      });
    }, this);

    _(this.edges).pushArray(_.union(this.task_input_to_task_edges, this.task_input_source_to_task_input_edges, this.task_input_potential_source_to_task_input_edges));
  });
}
FocalTaskGraph.prototype = _.extend(Object.create(FocalGraph.prototype), {
  constructor: FocalTaskGraph
});

function FocalInputsGraph(pipeline) {
  FocalGraph.call(this, pipeline, function(){
    this.outbound_datum_nodes = _.map(this.pipeline.inputs, function(pl_input){return new FocalOutboundDatumNode(this, pl_input);}, this);
  });
}
FocalInputsGraph.prototype = _.extend(Object.create(FocalGraph.prototype), {
  constructor: FocalInputsGraph
});

function FocalTaskInputNode(graph, task_input) {
  this.graph = graph;
  this.task_input = task_input;
}
_.extend(FocalTaskInputNode.prototype, {

});

function FocalTaskInputSrcNode(graph, task_input) {
  this.graph = graph;
  this.task_input = task_input;
}
_.extend(FocalTaskInputSrcNode.prototype, {

});

function FocalTaskInputPotentialSrcNode(graph, task_input) {
  this.graph = graph;
  this.task_input = task_input;
}
_.extend(FocalTaskInputSrcNode.prototype, {

});

function FocalOutboundDatumNode(graph, outbound_datum) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
}
_.extend(FocalOutboundDatumNode.prototype, {

});

function FocalDestNode(graph, outbound_datum, dest) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
  this.dest = outbound_dest;
}
_.extend(FocalDestNode.prototype, {

});

function FocalPotentialDestNode(graph, outbound_datum, potential_dest) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
  this.potential_dest = outbound_potential_dest;
}
_.extend(FocalPotentialDestNode.prototype, {

});

function FocalPotentialDestGroupNode(graph, outbound_datum) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
}
_.extend(FocalPotentialGroupNode.prototype, {

});

function FocalEdge(options) {
  this.graph = options.graph;
  this.source = options.source;
  this.target = options.target;
}
_.extend(FocalEdge.prototype, {

});