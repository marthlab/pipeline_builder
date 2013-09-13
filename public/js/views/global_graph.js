function GlobalGraph(pipeline) {
  this.pipeline = pipeline;

  this.task_nodes = _.map(this.pipeline.tasks, function(task) {return new GlobalNode(this, task);}, this);
  this.input_dummy_node = new GlobalNode(this, this.pipeline.inputs);
  this.primary_nodes = _.union(this.task_nodes, [this.input_node]);

  this.task_output_nodes = _.map(_.flatten(_.pluck(this.pipeline.tasks, "outputs"), true), function(task_output){return new GlobalNode(this, task_output);}, this);
  this.pipeline_input_nodes = _.map(this.pipeline.inputs, function(pl_input) {return new GlobalNode(this, pl_input);}, this);
  this.secondary_nodes = _.union(this.task_output_nodes, this.pipeline_input_nodes);

  this.edges = _.union(
    _.map(this.pipeline_input_nodes, function(pl_input_node){
      return new GlobalEdge({
        graph: this,
        source: this.input_dummy_node,
        target: pl_input_node
      });
    }, this),
    _.map(this.task_output_nodes, function(task_output_node){
      return new GlobalEdge({
        graph: this, 
        source: _.find(this.task_nodes, {datum: task_output_node.datum.task}), 
        target: task_output_node
      });
    }, this),
    _.map(_.filter(_.flatten(_.pluck(this.pipeline.tasks, "inputs"), true), 'src'), function(task_input) {
      return new GlobalEdge({
        graph: this, 
        source: _.find(this.secondary_nodes, {datum: task_input.src}),
        target: _.find(this.task_nodes, {datum: task_input.task})
      });
    }, this)
  )
}
_.extend(GlobalGraph.prototype, {

});

function GlobalNode(graph, datum) {
  this.graph = graph;
  this.datum = datum;
  if(this.datum instanceof Task) {
    this.style_class = 'primary';
    this.label = this.datum.tool.id;
  } else if(this.datum === this.graph.pipeline.inputs) {
    this.style_class = 'primary';
    this.label = "Input Data";
  } else if(this.datum instanceof TaskOutput) {
    this.style_class = 'secondary';
    this.label = this.datum.tool_output.id;
  } else if(this.datum instanceof PipelineInput) {
    this.style_class = 'secondary';
    this.label = this.datum.id;
  }
}
_.extend(GlobalNode.prototype, {

});

function GlobalEdge(options) {
  this.graph = options.graph;
  this.source = options.source;
  this.target = options.target;
}
_.extend(GlobalEdge.prototype, {

});