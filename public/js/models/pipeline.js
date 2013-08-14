var Pipeline = function(pl_cfg) {
  this.id = pl_cfg.id;

  this.components = _.map(pl_cfg.components, function(cmpt_cfg) {
    if(cmpt_cfg.component_type === 'tool') {
      return new Tool(cmpt_cfg);
    } else if (cmpt_cfg.component_type === 'pipeline') {
      return new Pipeline(cmpt_cfg);
    }
  });

  this._constructNodes(pl_cfg.inputs, pl_cfg.outputs, pl_cfg.tasks);

}
_.extend(Pipeline.prototype, {
  // PRIVATE
  _constructNodes: function(pl_input_cfgs, pl_output_cfgs, task_cfgs) {

    this.inputs = [];
    this.outputs = [];
    this.tasks = [];

    var pl_input_cfgs = _.map(pl_input_cfgs, function(pl_input_cfg, pl_input_id) {
      return _.extend(pl_input_cfg, {pipeline_input_id: pl_input_id});
    });
    var pl_output_cfgs = _.map(pl_output_cfgs, function(pl_output_cfg, pl_output_id) {
      return _.extend(pl_output_cfg, {pipeline_output_id: pl_output_id});
    });
    var task_cfgs = _.map(task_cfgs, function(task_cfg, task_id) {
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

    _.each(sorted_node_objects, function(cfg) {
      if('task_id' in cfg) {
        this.tasks.push(new Task(this, cfg));
      } else if ('pipeline_input_id' in cfg) {
        this.inputs.push(new PipelineInput(this, cfg));
      } else if ('pipeline_output_id' in cfg) {
        this.outputs.push(new PipelineOutput(this, cfg));
      }
    }, this);
  },
  // PUBLIC
  toJSON: function() {
    return {
      id: this.id,
      component_type: 'pipeline',
      components: _.methodMap(this.components, "toJSON"),
      tasks: _.object(_.pluck(this.tasks, "id"), _.methodMap(this.tasks, "toJSON")),
      inputs: _.object(_.pluck(this.inputs, "id"), _.map(this.inputs, _.partialRight(_.omit, ["id", "pipeline"]))),
      outputs: _.object(_.pluck(this.outputs, "id"), _.map(this.outputs, function(output){
        var src = output.src;
        if(_.isUndefined(src)) {
          return {};
        } else if(src.constructor === TaskOutput) {
          return {src:{task_id: src.task.id, component_output_id: src.component_output.id}};
        } else if(src.constructor === PipelineInput) {
          return {src:{pipeline_input_id: src.id}};
        }
      }))
    };
  },
  getComponent: function(component_id) {
    return _.find(this.components, {id: component_id});
  },
  getTask: function(task_id) {
    return _.find(this.tasks, {id: task_id});
  },
  getInput: function(input_id) {
    return _.find(this.inputs, {id: input_id});
  }
})

var PipelineInput = function(pipeline, pl_input_cfg) {
  this.pipeline = pipeline;
  this.id = pl_input_cfg.pipeline_input_id;
  this.description = pl_input_cfg.description;
  this.data_URL = pl_input_cfg.data_URL;
}
_.extend(PipelineInput.prototype, {

})

var PipelineOutput = function(pipeline, pl_output_cfg) {
  this.pipeline = pipeline;
  this.id = pl_output_cfg.pipeline_output_id;
  var src = pl_output_cfg.src;
  if('task_id' in src && 'component_output_id' in src) {
    this.src = this.pipeline.getTask(src.task_id).getOutput(src.component_output_id);
  } else if ('pipeline_input_id' in src) {
    this.src = this.pipeline.getInput(src.pipeline_input_id);
  }
}
_.extend(PipelineOutput.prototype, {

})
