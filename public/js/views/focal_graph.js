function AbstractFocalGraph(pipeline, subclass_init) {
  this.pipeline = pipeline;

  subclass_init.call(this);

  this.dest_nodes = _.flatten(_.map(this.outbound_datum_nodes_with_format, function(od_node){
    var dest_tasks = _.methodFilter(this.pipeline.tasks, 'hasAsInputSource', od_node.outbound_datum);
    return _.map(dest_tasks, function(task){return new FocalDestNode(this, od_node.outbound_datum, task)}, this);
  }, this), true);
  this.potential_dest_nodes = _.flatten(_.map(this.outbound_datum_nodes_with_format, function(od_node){
    var potential_dest_tool_inputs = app.tool_library.getSuggestedToolInputsByFormat(od_node.outbound_datum.getFormat() );
    var potential_dest_packages = _.groupBy(potential_dest_tool_inputs, function(ti) {return ti.tool.package;});
    return _.map(potential_dest_packages, function(tool_inputs, package){return new FocalPotentialDestNode(this, od_node.outbound_datum, package, tool_inputs);}, this);
  }, this), true);
  this.potential_dest_group_nodes = _.map(_.filter(this.outbound_datum_nodes_with_format, function(o_data_node) {
    return _.some(this.potential_dest_nodes, {outbound_datum: o_data_node.outbound_datum});
  }, this), function(od_node) {return new FocalPotentialDestGroupNode(this, od_node.outbound_datum);}, this);

  this.outbound_datum_to_dest_edges = _.map(this.dest_nodes, function(o_dest_node){
    return new FocalEdge({
      graph: this,
      source: _.findExact(this.outbound_datum_nodes_with_format, {outbound_datum: o_dest_node.outbound_datum}),
      target: o_dest_node
    });
  }, this);
  this.outbound_datum_to_potential_dest_group_edges = _.map(this.potential_dest_group_nodes, function(o_pot_group_node){
    return new FocalEdge({
      graph: this,
      source: _.findExact(this.outbound_datum_nodes_with_format, {outbound_datum: o_pot_group_node.outbound_datum}),
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

}
_.extend(AbstractFocalGraph.prototype, {
  getNodes: function() {
    return _.union(this.outbound_datum_nodes_with_format, this.outbound_datum_nodes_without_format, this.dest_nodes, this.potential_dest_nodes, this.potential_dest_group_nodes);
  },
  getEdges: function() {
    return _.union(this.outbound_datum_to_dest_edges, this.outbound_datum_to_potential_dest_group_edges, this.potential_dest_group_to_potential_dest_edges);
  }
});

function FocalTaskGraph(task) {
  AbstractFocalGraph.call(this, task.pipeline, function(){
    this.task = task;

    this.task_node = new FocalTaskNode(this, this.task);
    this.task_input_nodes = _.map(this.task.inputs, function(task_input){return new FocalTaskInputNode(this, task_input);}, this);
    this.task_input_src_nodes = _.flatten(_.map(this.task.inputs, function(task_input) {
      return _.map(task_input.sources, function(source) {
        return new FocalTaskInputSrcNode(this, task_input, source);
      }, this);
    }, this));
    this.task_input_add_existing_src_nodes = _.flatten(_.map(_.methodFilter(this.task.inputs, 'hasPotentialSources'), function(task_input){
      return new FocalTaskInputAddExistingSrcNode(this, task_input);
    }, this));
    this.task_input_add_new_src_nodes = _.flatten(_.map(_.methodReject(this.task.inputs, 'isSaturated'), function(task_input){
      return new FocalTaskInputAddNewSrcNode(this, task_input);
    }, this));
    
    this.outbound_datum_nodes_with_format = _.map(_.methodFilter(this.task.outputs, 'isAssignedFormat'), function(task_output){return new FocalTaskOutputNode(this, task_output);}, this);
    this.outbound_datum_nodes_without_format = _.map(_.methodReject(this.task.outputs, 'isAssignedFormat'), function(task_output){return new FocalTaskOutputNode(this, task_output);}, this);

    this.available_format_nodes = _.flatten(_.map(this.outbound_datum_nodes_without_format, function(to_node){
      var available_formats = to_node.outbound_datum.getAvailableFormats();
      return _.map(available_formats, function(format){return new FocalAvailableFormatNode(this, to_node.outbound_datum, format);}, this);
    }, this), true);

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
    this.task_input_add_existing_src_to_task_input_edges = _.map(this.task_input_add_existing_src_nodes, function(tiaes_node){
      return new FocalEdge({
        graph: this,
        source: tiaes_node,
        target: _.findExact(this.task_input_nodes, {task_input: tiaes_node.task_input})
      });
    }, this);
    this.task_input_add_new_src_to_task_input_edges = _.map(this.task_input_add_new_src_nodes, function(tians_node){
      return new FocalEdge({
        graph: this,
        source: tians_node,
        target: _.findExact(this.task_input_nodes, {task_input: tians_node.task_input})
      });
    }, this);
    this.task_to_task_output_edges = _.map(_.union(this.outbound_datum_nodes_with_format, this.outbound_datum_nodes_without_format), function(od_node){
      return new FocalEdge({
        graph: this,
        source: this.task_node,
        target: od_node
      });
    }, this);
    this.outbound_datum_to_available_format_edges = _.map(this.available_format_nodes, function(pf_node){
      return new FocalEdge({
        graph: this,
        source: _.findExact(this.outbound_datum_nodes_without_format, {outbound_datum: pf_node.outbound_datum}),
        target: pf_node
      });
    }, this);

  });

}
FocalTaskGraph.prototype = _.extend(Object.create(AbstractFocalGraph.prototype), {
  constructor: FocalTaskGraph,
  getNodes: function() {
    var from_super = AbstractFocalGraph.prototype.getNodes.call(this);
    return _.union(from_super, [this.task_node], this.task_input_nodes, this.task_input_src_nodes, this.task_input_add_existing_src_nodes, this.task_input_add_new_src_nodes, this.available_format_nodes);
  },
  getEdges: function() {
    var from_super = AbstractFocalGraph.prototype.getEdges.call(this);
    return _.union(from_super, this.task_input_to_task_edges, this.task_input_source_to_task_input_edges, this.task_input_add_existing_src_to_task_input_edges, this.task_input_add_new_src_to_task_input_edges, this.task_to_task_output_edges, this.outbound_datum_to_available_format_edges);
  }
});

function FocalPipelineInputsGraph(pipeline) {
  AbstractFocalGraph.call(this, pipeline, function(){
    this.outbound_datum_nodes_with_format = _.map(this.pipeline.inputs, function(pl_input){return new FocalPipelineInputNode(this, pl_input);}, this);
    this.outbound_datum_nodes_without_format = [];
    this.potential_pipeline_input_node = new FocalPotentialPipelineInputNode(this);
  });
}
FocalPipelineInputsGraph.prototype = _.extend(Object.create(AbstractFocalGraph.prototype), {
  getNodes: function() {
    var from_super = AbstractFocalGraph.prototype.getNodes.call(this);
    return _.union(from_super, [this.potential_pipeline_input_node]);
  },
  constructor: FocalPipelineInputsGraph
});

var abstract_focal_node = {};

function FocalTaskInputSrcNode(graph, task_input, source) {
  this.graph = graph;
  this.task_input = task_input;
  this.source = source;

  if(this.source instanceof PipelineInput) {
    this.label = this.source.id;
  } else if(this.source instanceof TaskOutput) {
    this.label = this.source.task.id + ' ('+this.source.tool_output.id+')';
  }
  
}
FocalTaskInputSrcNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: FocalTaskInputSrcNode
});

function FocalTaskInputAddNewSrcNode(graph, task_input) {
  this.graph = graph;
  this.task_input = task_input;
  this.label = "Add Data";
}
FocalTaskInputAddNewSrcNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: FocalTaskInputAddNewSrcNode
});

function FocalTaskInputAddExistingSrcNode(graph, task_input) {
  this.graph = graph;
  this.task_input = task_input;
  this.label = "Select Data";
}
FocalTaskInputAddExistingSrcNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: FocalTaskInputAddExistingSrcNode
});

function FocalTaskInputNode(graph, task_input) {
  this.graph = graph;
  this.task_input = task_input;
  this.label = this.task_input.tool_input.id;
}
FocalTaskInputNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: FocalTaskInputNode
});

function FocalTaskNode(graph, task) {
  this.graph = graph;
  this.task = task;
  this.label = this.task.tool.id;
}
FocalTaskNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: FocalTaskNode
});

function FocalPotentialPipelineInputNode(graph) {
  this.graph = graph;
  this.label = "Add New Input";
}
FocalPotentialPipelineInputNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: FocalPotentialPipelineInputNode
});

function AbstractFocalOutboundDatumNode(graph, outbound_datum) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
}
AbstractFocalOutboundDatumNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: AbstractFocalOutboundDatumNode
});

function FocalPipelineInputNode(graph, task_output) {
  AbstractFocalOutboundDatumNode.call(this, graph, task_output);
  this.task_output = task_output;
  this.label = this.outbound_datum.id +  ' ('+this.outbound_datum.getFormat()+')';
}
FocalPipelineInputNode.prototype = _.extend(Object.create(AbstractFocalOutboundDatumNode.prototype), {
  constructor: FocalPipelineInputNode
});

function FocalTaskOutputNode(graph, task_output) {
  AbstractFocalOutboundDatumNode.call(this, graph, task_output);
  this.task_output = task_output;
  this.label = this.outbound_datum.tool_output.id + (this.outbound_datum.isAssignedFormat() ? ' ('+this.outbound_datum.getFormat()+')' : '');
}
FocalTaskOutputNode.prototype = _.extend(Object.create(AbstractFocalOutboundDatumNode.prototype), {
  constructor: FocalTaskOutputNode
});

function FocalAvailableFormatNode(graph, task_output, format) {
  this.graph = graph;
  this.outbound_datum = this.task_output = task_output;
  this.format = format;
  this.label = format;
}
FocalAvailableFormatNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: FocalAvailableFormatNode
});

function FocalPotentialDestGroupNode(graph, outbound_datum) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
}
FocalPotentialDestGroupNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: FocalPotentialDestGroupNode
});

function FocalDestNode(graph, outbound_datum, dest) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
  this.dest = dest;
  this.label = this.dest.tool.id;
}
FocalDestNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: FocalDestNode
});

function FocalPotentialDestNode(graph, outbound_datum, package, tool_inputs) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
  this.potential_dests = tool_inputs;
  this.label = package;
}
FocalPotentialDestNode.prototype = _.extend(Object.create(abstract_focal_node), {
  constructor: FocalPotentialDestNode
});

function FocalEdge(options) {
  this.graph = options.graph;
  this.source = options.source;
  this.target = options.target;
}
_.extend(FocalEdge.prototype, {

});