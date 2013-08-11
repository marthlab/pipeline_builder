var Pipeline = function(pl_cfg) {
  this.name = pl_cfg.name;

  this.tools = _.map(pl_cfg.tools, function(tool_cfg) {
    return tool_library.getTool(tool_cfg);
  });

  var pl_input_cfgs = _.map(pl_cfg.pipeline_inputs, function(pl_input_cfg, pl_input_id) {
    return _.extend(pl_input_cfg, {pipeline_input_id: pl_input_id});
  });
  var pl_output_cfgs = _.map(pl_cfg.pipeline_outputs, function(pl_output_cfg, pl_output_id) {
    return _.extend(pl_output_cfg, {pipeline_output_id: pl_output_id});
  });
  var task_cfgs = _.map(pl_cfg.tasks, function(task_cfg, task_id) {
    return _.extend(task_cfg, {task_id: task_id});
  });

  var node_objects = _.union(pl_input_cfgs, pl_output_cfgs, task_cfgs);

  var sources_to_task_cfgs = _.flatten(
    _.map(task_cfgs, function(task_cfg){
      return _.map(_.filter(task_cfg.task_inputs, function(task_input_cfg) {
        return "source" in task_input_cfg;
      }), function(task_input_cfg){
        return {source: task_input_cfg.source, target: task_cfg};
      })
    }),
    true
  )

  var sources_to_pl_outputs = _.map(_.filter(pl_output_cfgs, function(pl_output_cfg) {
    return "source" in pl_output_cfg;
  }), function(pl_output_cfg) {
    return {source: pl_output_cfg.source, target: pl_output_cfg};
  });

  var edges = _.map(_.union(sources_to_task_cfgs, sources_to_pl_outputs), function(connection) {
    return [
      _.indexOf(node_objects,
        ("task_id" in connection.source) && _.find(task_cfgs, {'task_id':connection.source.task_id})
        ||
        ("pipeline_input_id" in connection.source) && _.find(pl_input_cfgs, {'pipeline_input_id':connection.source.pipeline_input_id})
      ),
      _.indexOf(node_objects, connection.target)
    ]
  });

  var G = jsnx.DiGraph();
  G.add_nodes_from(_.range(node_objects.length));
  G.add_edges_from(edges);
  var sorted = _.map(jsnx.topological_sort(G), function(i) { return node_objects[i];});

    debugger;


}
_.extend(Tool.prototype, {
  toJSON: function() {
    return {
      name: this.name,
      options: _.object(_.pluck(this.options, "id"), _.map(this.options, _.partialRight(_.omit, ["id", "tool"]))),
      inputs: _.object(_.pluck(this.inputs, "id"), _.map(this.inputs, _.partialRight(_.omit, ["id", "tool"]))),
      outputs: _.object(_.pluck(this.outputs, "id"), _.map(this.outputs, _.partialRight(_.omit, ["id", "tool"])))
    };
  }
})