function Pipeline(pl_cfg) {

  if(_.isUndefined(pl_cfg)) {
    pl_cfg = {id: 'auto', tools: [], inputs: [], tasks: []};
  }

  this.id = pl_cfg.id;

  this.tools = _.map(pl_cfg.tools, function(cmpt_cfg) {
    return new Tool(cmpt_cfg);
  });

  this._constructNodes(pl_cfg.inputs, pl_cfg.tasks);

}
_.extend(Pipeline.prototype, Backbone.Events, {
  constructor: Pipeline,
  // PRIVATE
  _constructNodes: function(pl_input_cfgs, task_cfgs) {

    this.inputs = [];
    this.tasks = [];

    var pl_input_cfgs = _.map(pl_input_cfgs, function(pl_input_cfg, pl_input_id) {
      return _.extend(pl_input_cfg, {pipeline_input_id: pl_input_id});
    });
    var task_cfgs = _.map(task_cfgs, function(task_cfg, task_id) {
      return _.extend(task_cfg, {task_id: task_id});
    });

    var node_objects = _.union(pl_input_cfgs, task_cfgs);

    var sources_to_task_cfgs = _.flatten(
      _.map(task_cfgs, function(task_cfg){
        return _.flatten(
          _.map(task_cfg.input_src_assignments, function(task_input_src_assignment_cfg){
            if(_.isArray(task_input_src_assignment_cfg)) {
              return _.map(task_input_src_assignment_cfg, function(sub_cfg) {return {src: sub_cfg, target: task_cfg}; });
            } else {
              return [{src: task_input_src_assignment_cfg, target: task_cfg}];
            }
          }), true
        );
      }), true
    );

    var edges = _.map(sources_to_task_cfgs, function(connection) {
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
        this.addTask(cfg);
      } else if ('pipeline_input_id' in cfg) {
        this.addInput(cfg);
      }
    }, this);
  },
  // PUBLIC
  toJSON: function() {
    return {
      id: this.id,
      tools: _.methodMap(this.tools, "toJSON"),
      tasks: _.object(_.pluck(this.tasks, "id"), _.methodMap(this.tasks, "toJSON")),
      inputs: _.object(_.pluck(this.inputs, "id"), _.map(this.inputs, _.partialRight(_.omit, ["id", "pipeline"])))
    };
  },
  hasTool: function(tool_id) {
    return _.some(this.tools, {id: tool_id});
  },
  getTool: function(tool_id) {
    return _.find(this.tools, {id: tool_id});
  },
  getTask: function(task_id) {
    return _.find(this.tasks, {id: task_id});
  },
  getInput: function(input_id) {
    return _.find(this.inputs, {id: input_id});
  },
  getTaskOutputs: function() {
    return _.flatten(_.pluck(this.tasks, 'outputs'));
  },
  addTool: function(tool) {
    if(!_(this.tools).contains(tool)) {
      this.tools.push(tool);
    }
  },
  addInput: function(pl_input_cfg) {
    var input = new PipelineInput(this, pl_input_cfg);
    this.inputs.push(input);
    this.trigger("add:input", input);
    return input;
  },
  addTask: function(task_cfg) {
    var task = new Task(this, task_cfg);
    this.tasks.push(task);
    this.trigger("add:task", task);
  },
  getFinalizedTasks: function() {
    return _.methodFilter(this.tasks, 'isFinalized');
  },
  getNonfinalizedTasks: function() {
    return _.methodReject(this.tasks, 'isFinalized');
  }
})

function PipelineInput(pipeline, pl_input_cfg) {
  this.pipeline = pipeline;
  this.id = pl_input_cfg.pipeline_input_id;
  this.description = pl_input_cfg.description;
  this.data_URL = pl_input_cfg.data_URL;
}
_.extend(PipelineInput.prototype, Backbone.Events, {
  getFormat: function() {
    var re = /(?:\.([^.]+))?$/;
    return re.exec(this.data_URL)[1];
  },
  providesMultiple: function() {
    return false;
  },
  getFocalParentObject: function() {
    return this.pipeline.inputs;
  },
  dependsOnTask: function(task) {
    return false;
  }
})
