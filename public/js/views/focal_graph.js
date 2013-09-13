function FocalGraph(pipeline, focus_item) {
  this.pipeline = pipeline;
  this.focus_item = focus_item;
  this.nodes = [];
  this.edges = [];
  if(this.focus_item instanceof Task) {
    this.task = this.focus_item;

    this.task_node = new FocalTaskNode(this, this.task);
    this.task_input_nodes = _.map(this.task.task_inputs, function(task_input){return new FocalTaskInputNode(this, task_input);}, this);
    this.task_input_src_nodes = _.map(_.filter(this.task.task_inputs, 'src'), function(task_input){return new FocalTaskInputSrcNode(this, task_input);}, this);
    this.task_input_potential_src_nodes = _.map(_.reject(this.task.task_inputs, 'src'), function(task_input){return new FocalTaskInputPotentialSrcNode(this, task_input);}, this);
    this.outbound_data_nodes = _.map(this.task.task_outputs, function(task_output){return new FocalOutboundDataNode(this, task_output);}, this);

    this.nodes.push(this.task_node);
    this.nodes.pushArray(this.task_input_nodes);
    this.nodes.pushArray(this.task_input_src_nodes);
    this.nodes.pushArray(this.task_input_potential_src_nodes);

    this.edges.pushArray(_.map(this.task_input_nodes, function(ti_node){
      return new FocalEdge({
        graph: this,
        source: ti_node,
        target: this.task_node
      });
    }, this)); 
    this.edges.pushArray(_.map(this.task_input_src_nodes, function(tis_node){
      return new FocalEdge({
        graph: this,
        source: tis_node,
        target: _.find(this.task_input_nodes, {task_input: tis_node.task_input})
      });
    }, this));
    this.edges.pushArray(_.map(this.task_input_potential_src_nodes, function(tips_node){
      return new FocalEdge({
        graph: this,
        source: tips_node,
        target: _.find(this.task_input_nodes, {task_input: tips_node.task_input})
      });
    }, this));
  } else if(this.focus_item === this.pipeline.inputs) {
    this.outbound_data_nodes = _.map(this.pipeline.inputs, function(pl_input){return new FocalOutboundDataNode(this, pl_input);}, this);
  }

  this.nodes.pushArray(this.outbound_data_nodes);

  this.outbound_dest_nodes = _.flatten(_.map(this.outbound_data_nodes, function(o_data_node){
    var outbound_tasks =  _.filter(this.pipeline.tasks, function(task){return _.contains(_.pluck(task.task_inputs, 'src'), o_data_node.output_datum); });
    return _.map(outbound_tasks, function(outbound_task){return new FocalOutboundDestNode(this, o_data_node.output_datum, outbound_task)}, this);
  }, this), true);
  this.outbound_potential_dest_nodes = _.flatten(_.map(this.outbound_data_nodes, function(o_data_node){
    var outbound_potential_tools = tool_library.getToolsAcceptingFileExt(o_data_node.outbound_datum.getFileExt() );
    return _.map(outbound_potential_tools, function(outbound_potential_tool){return new FocalOutboundPotentialDestNode(this, o_data_node.output_datum, outbound_potential_tool);}, this);
  }, this), true);
  this.outbound_potential_group_nodes = _.map(_.filter(this.outbound_data_nodes, function(o_data_node) {
    return _.some(this.outbound_potential_dest_nodes, {outbound_datum: o_data_node.outbound_datum});
  }, this), function(o_data_node) {return new FocalOutboundPotentialGroupNode(this, o_data_node.output_datum);}, this);

  this.nodes.pushArray(this.outbound_dest_nodes);
  this.nodes.pushArray(this.outbound_potential_dest_nodes);
  this.nodes.pushArray(this.outbound_potential_group_nodes);

  this.edges.pushArray(_.map(this.outbound_data_nodes, function(od_node){
    return new FocalEdge({
      graph: this,
      source: this.task_node,
      target: od_node
    });
  }), this);
  this.edges.pushArray(_.map(this.outbound_dest_nodes, function(o_dest_node){
    return new FocalEdge({
      graph: this,
      source: _.find(this.outbound_data_nodes, {outbound_datum: o_dest_node.outbound_datum}),
      target: o_dest_node
    });
  }, this));
  this.edges.pushArray(_.map(this.outbound_potential_group_nodes, function(o_pot_group_node){
    return new FocalEdge({
      graph: this,
      source: _.find(this.outbound_data_nodes, {outbound_datum: o_pot_group_node.outbound_datum}),
      target: o_pot_group_node
    });
  }, this));
  this.edges.pushArray(_.map(this.outbound_potential_dest_nodes, function(o_pot_dest_node){
    return new FocalEdge({
      graph: this,
      source: _.find(this.outbound_potential_group_nodes, {outbound_datum: o_pot_dest_node.outbound_datum}),
      target: o_pot_dest_node
    });
  }, this));
}
_.extend(FocalGraph.prototype, {

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

function FocalOutboundDataNode(graph, outbound_datum) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
}
_.extend(FocalOutboundDataNode.prototype, {

});

function FocalOutboundDestNode(graph, outbound_datum, outbound_dest) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
  this.outbound_dest = outbound_dest;
}
_.extend(FocalOutboundDestNode.prototype, {

});

function FocalOutboundPotentialDestNode(graph, outbound_datum, outbound_potential_dest) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
  this.outbound_potential_dest = outbound_potential_dest;
}
_.extend(FocalOutboundPotentialDestNode.prototype, {

});

function FocalOutboundPotentialGroupNode(graph, outbound_datum) {
  this.graph = graph;
  this.outbound_datum = outbound_datum;
}
_.extend(FocalOutboundPotentialGroupNode.prototype, {

});

function FocalEdge(options) {
  this.graph = options.graph;
  this.source = options.source;
  this.target = options.target;
}
_.extend(FocalEdge.prototype, {

});