var Pipeline = function(pl_cfg) {
  this.name = pl_cfg.name;

  this.tools = _.map(pl_cfg.tools, function(tool_cfg) {
    return tool_library.getTool(tool_cfg);
  });

  this.tasks = [];
  this.inputs = [];
  this.outputs = [];

  var pl_input_cfgs = _.map(pl_cfg.inputs, function(pl_input_cfg, pl_input_id) {
    return _.extend(pl_input_cfg, {pipeline_input_id: pl_input_id});
  });
  var pl_output_cfgs = _.map(pl_cfg.outputs, function(pl_output_cfg, pl_output_id) {
    return _.extend(pl_output_cfg, {pipeline_output_id: pl_output_id});
  });
  var task_cfgs = _.map(pl_cfg.tasks, function(task_cfg, task_id) {
    return _.extend(task_cfg, {task_id: task_id});
  });

  var node_objects = _.union(pl_input_cfgs, pl_output_cfgs, task_cfgs);

  var sources_to_task_cfgs = _.flatten(
    _.map(task_cfgs, function(task_cfg){
      return _.map(_.filter(task_cfg.input_assignments, function(task_input_cfg) {
        return 'src' in task_input_cfg;
      }), function(task_input_cfg){
        return {src: task_input_cfg.src, target: task_cfg};
      })
    }),
    true
  )

  var sources_to_pl_outputs = _.map(_.filter(pl_output_cfgs, function(pl_output_cfg) {
    return 'src' in pl_output_cfg;
  }), function(pl_output_cfg) {
    return {src: pl_output_cfg.src, target: pl_output_cfg};
  });

  var edges = _.map(_.union(sources_to_task_cfgs, sources_to_pl_outputs), function(connection) {
    return [
      _.indexOf(node_objects,
        ('task_id' in connection.src) && _.find(task_cfgs, {'task_id':connection.src.task_id})
        ||
        ('pipeline_input_id' in connection.src) && _.find(pl_input_cfgs, {'pipeline_input_id':connection.src.pipeline_input_id})
      ),
      _.indexOf(node_objects, connection.target)
    ]
  });

  var dependency_graph = jsnx.DiGraph();
  dependency_graph.add_nodes_from(_.range(node_objects.length));
  dependency_graph.add_edges_from(edges);
  var sorted_node_objects = _.map(jsnx.topological_sort(dependency_graph), function(i) { return node_objects[i];});

  _.each(sorted_node_objects, function(node_object) {
    if('task_id' in node_object && 'tool_output_id' in node_object) {
      this.tasks.push(new Task(this, node_object));
    } else if ('pipeline_input_id' in node_object) {
      this.inputs.push(new PipelineInput(this, node_object));
    } else if ('pipeline_output_id' in node_object) {
      this.outputs.push(new PipelineOutput(this, node_object));
    }
  }, this);

debugger;
}
_.extend(Pipeline.prototype, {
  toJSON: function() {

  }
})

var PipelineInput = function(pipeline, pl_input_cfg) {
  this.pipeline = pipeline;
  this.id = pl_input_cfg.pipeline_input_id;
  this.description = pl_input_cfg.description;
  this.legal_file_extensions = pl_input_cfg.legal_file_extensions;
}
_.extend(PipelineInput.prototype, {

})

var PipelineOutput = function(pipeline, pl_output_cfg) {
  this.pipeline = pipeline;
  this.id = pl_input_cfg.pipeline_output_id;
  var src = pl_output_cfg.src;
  if('task_id' in src && 'tool_output_id' in src) {
    this.src = this.pipeline.getTask(src.task_id).getOutput(src.tool_output_id);
  } else if ('pipeline_input_id' in src) {
    this.src = this.pipeline.getInput(src.pipeline_input_id);
  }
}
_.extend(PipelineOutput.prototype, {

})
