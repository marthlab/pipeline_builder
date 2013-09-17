function Task(pipeline, task_cfg) {

  this.pipeline = pipeline;
  this.id = task_cfg.task_id;
  this.tool = this.pipeline.getTool(task_cfg.tool_id);

  this.options = _.map(this.tool.options || [], function(tool_option) {
    return new TaskOption(this, tool_option, task_cfg.option_assignments[tool_option.id]);
  }, this);
  this.inputs = _.map(this.tool.inputs || [], function(tool_input) {
    return new TaskInput(this, tool_input, task_cfg.input_assignments[tool_input.id]);
  }, this);
  this.outputs = _.map(this.tool.outputs || [], function(tool_output) {
    return new TaskOutput(this, tool_output);
  }, this);

}
_.extend(Task.prototype, {
  toJSON: function() {
    var assigned_options = _.methodFilter(this.options, "isAssigned");
    var assigned_inputs = _.methodFilter(this.inputs, "isAssigned");
    return {
      tool_id: this.tool.id,
      option_assignments: _.object(
        _.pluck(_.pluck(assigned_options, "tool_option"), "id"),
        _.pluck(assigned_options, 'value')
      ),
      input_assignments: _.object(
        _.pluck(_.pluck(assigned_inputs, "tool_input"), "id"),
        _.map(assigned_inputs, function(output){
          var src = output.src;
          if(src instanceof TaskOutput) {
            return {src:{task_id: src.task.id, tool_output_id: src.tool_output.id}};
          } else if(src instanceof PipelineInput) {
            return {src:{pipeline_input_id: src.id}};
          }
        })
      )
    };
  },
  getOutput: function(tool_output_id) {
    return _.find(this.outputs, {tool_output: this.tool.getOutput(tool_output_id)}, this);
  }
});

function TaskOption(task, tool_option, option_assignment_cfg) {
  this.task = task;
  this.tool_option = tool_option;
  if(!_.isUndefined(option_assignment_cfg)) {
    this.value = option_assignment_cfg;
  }
}
_.extend(TaskOption.prototype, {
  isAssigned: function() { return !_.isUndefined(this.value); }
})

function TaskInput(task, tool_input, input_assignment_cfg) {
  this.task = task;
  this.tool_input = tool_input;
  if(!_.isUndefined(input_assignment_cfg)) {
    var src = input_assignment_cfg.src;
    if('task_id' in src && 'tool_output_id' in src) {
      this.src = this.task.pipeline.getTask(src.task_id).getOutput(src.tool_output_id);
    } else if ('pipeline_input_id' in src) {
      this.src = this.task.pipeline.getInput(src.pipeline_input_id);
    }
  }

}
_.extend(TaskInput.prototype, {
  isAssigned: function() { return !_.isUndefined(this.src); }
})

function TaskOutput(task, tool_output) {
  this.task = task;
  this.tool_output = tool_output;

}
_.extend(TaskOutput.prototype, {
  getFileExt: function() {
    return this.tool_output.file_extension;
  }
})