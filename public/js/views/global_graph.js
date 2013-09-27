function GlobalGraph(pipeline) {
  this.pipeline = pipeline;

  this.task_nodes = _.map(this.pipeline.tasks, function(task) {return new GlobalTaskNode(this, task);}, this);
  this.inputs_dummy_node = new GlobalPipelineInputsNode(this);

  this.task_output_nodes = _.map(_.flatten(_.pluck(this.pipeline.tasks, "outputs"), true), function(task_output){return new GlobalTaskOutputNode(this, task_output);}, this);
  this.pipeline_input_nodes = _.map(this.pipeline.inputs, function(pl_input) {return new GlobalPipelineInputNode(this, pl_input);}, this);

  this.dummy_to_input_edges = _.map(this.pipeline_input_nodes, function(pl_input_node){
    return new GlobalEdge({
      graph: this,
      source: this.inputs_dummy_node,
      target: pl_input_node
    });
  }, this);

  this.task_to_task_output_edges = _.map(this.task_output_nodes, function(task_output_node){
    return new GlobalEdge({
      graph: this, 
      source: _.findExact(this.task_nodes, {task: task_output_node.task_output.task}), 
      target: task_output_node
    });
  }, this);

  this.secondary_to_task_edges = _.flatten(
    _.map(this.getSecondaryNodes(), function(secondary_node){
      return this.task_nodes
            .filter(function(task_node){ return task_node.task.hasInputAssignedTo(secondary_node.datum);})
            .map(function(task_node) {
              return new GlobalEdge({
                graph: this, 
                source: secondary_node,
                target: task_node
              });
            }, this);
    }, this),
    true
  );

}
_.extend(GlobalGraph.prototype, {
  getPrimaryNodes: function() {
    return _.union(this.task_nodes, [this.inputs_dummy_node]);
  },
  getSecondaryNodes: function() {
    return _.union(this.task_output_nodes, this.pipeline_input_nodes);
  },
  getNodes: function() {
    return _.union(this.getPrimaryNodes(), this.getSecondaryNodes() );
  },
  getEdges: function() {
    return _.union(this.dummy_to_input_edges, this.task_to_task_output_edges, this.secondary_to_task_edges);
  }
});

var abstract_global_node = {};

function GlobalTaskNode(graph, task) {
  this.graph = graph;
  this.datum = this.task = task;
  this.label = this.task.id;
}
GlobalTaskNode.prototype = _.extend(Object.create(abstract_global_node), {
  constructor: GlobalTaskNode
});

function GlobalPipelineInputsNode(graph) {
  this.graph = graph;
  this.datum = this.pipeline_inputs = this.graph.pipeline.inputs;
  this.label = "Pipeline Inputs";
}
GlobalPipelineInputsNode.prototype = _.extend(Object.create(abstract_global_node), {
  constructor: GlobalPipelineInputsNode
});

function GlobalTaskOutputNode(graph, task_output) {
  this.graph = graph;
  this.datum = this.task_output = task_output;
  this.label = this.task_output.tool_output.id;
}
GlobalTaskOutputNode.prototype = _.extend(Object.create(abstract_global_node), {
  constructor: GlobalTaskOutputNode
});

function GlobalPipelineInputNode(graph, pipeline_input) {
  this.graph = graph;
  this.datum = this.pipeline_input = pipeline_input;
  this.label = this.pipeline_input.id;
}
GlobalPipelineInputNode.prototype = _.extend(Object.create(abstract_global_node), {
  constructor: GlobalPipelineInputNode
});


function GlobalEdge(options) {
  this.graph = options.graph;
  this.source = options.source;
  this.target = options.target;
}
_.extend(GlobalEdge.prototype, {

});