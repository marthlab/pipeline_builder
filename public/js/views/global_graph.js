function GlobalGraph(pipeline) {
  this.pipeline = pipeline;

  this.task_nodes = _.map(this.pipeline.tasks, function(task) {return new GlobalTaskNode(this, task);}, this);
  this.inputs_dummy_node = new GlobalPipelineInputsNode(this);
  this.primary_nodes = _.union(this.task_nodes, [this.inputs_dummy_node]);

  this.task_output_nodes = _.map(_.flatten(_.pluck(this.pipeline.tasks, "outputs"), true), function(task_output){return new GlobalTaskOutputNode(this, task_output);}, this);
  this.pipeline_input_nodes = _.map(this.pipeline.inputs, function(pl_input) {return new GlobalPipelineInputNode(this, pl_input);}, this);
  this.secondary_nodes = _.union(this.task_output_nodes, this.pipeline_input_nodes);

  this.nodes = _.union(this.primary_nodes, this.secondary_nodes);

  this.edges = _.union(
    _.map(this.pipeline_input_nodes, function(pl_input_node){
      return new GlobalEdge({
        graph: this,
        source: this.inputs_dummy_node,
        target: pl_input_node
      });
    }, this),
    _.map(this.task_output_nodes, function(task_output_node){
      return new GlobalEdge({
        graph: this, 
        source: _.find(this.task_nodes, {task: task_output_node.task_output.task}), 
        target: task_output_node
      });
    }, this),
    _.map(_.filter(_.flatten(_.pluck(this.pipeline.tasks, "inputs"), true), 'src'), function(task_input) {
      return new GlobalEdge({
        graph: this, 
        source: _.find(this.secondary_nodes, {datum: task_input.src}),
        target: _.find(this.task_nodes, {task: task_input.task})
      });
    }, this)
  )
}
_.extend(GlobalGraph.prototype, {

});

var abstract_global_node = {};

function GlobalTaskNode(graph, task) {
  this.graph = graph;
  this.datum = this.task = task;
  this.style_class = 'primary';
  this.label = this.task.tool.id;
}
GlobalTaskNode.prototype = _.extend(Object.create(abstract_global_node), {
  constructor: GlobalTaskNode
});

function GlobalPipelineInputsNode(graph) {
  this.graph = graph;
  this.datum = this.pipeline_inputs = this.graph.pipeline.inputs;
  this.style_class = 'primary';
  this.label = "Input Data";
}
GlobalPipelineInputsNode.prototype = _.extend(Object.create(abstract_global_node), {
  constructor: GlobalPipelineInputsNode
});

function GlobalTaskOutputNode(graph, task_output) {
  this.graph = graph;
  this.datum = this.task_output = task_output;
  this.style_class = 'secondary';
  this.label = this.task_output.tool_output.id;
}
GlobalTaskOutputNode.prototype = _.extend(Object.create(abstract_global_node), {
  constructor: GlobalTaskOutputNode
});

function GlobalPipelineInputNode(graph, pipeline_input) {
  this.graph = graph;
  this.datum = this.pipeline_input = pipeline_input;
  this.style_class = 'secondary';
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