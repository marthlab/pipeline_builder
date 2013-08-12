var Task = function(pipeline, task_cfg) {
  this.pipeline = pipeline;
  this.id = task_cfg.task_id;
  this.tool = this.pipeline.getTool(task_cfg.tool_id);

  this.options = _.map(this.tool.options, function(tool_option) {
    return new TaskOption(this, tool_option, task_cfg.option_values[tool_option.id]));
  }, this);
  this.inputs = _.map(this.tool.inputs, function(tool_input) {
    return new TaskInput(this, tool_input, task_cfg.input_assignments[tool_input.id]));
  }, this);
  this.outputs = _.map(this.tool.outputs, function(tool_output) {
    return new TaskOutput(this, tool_output));
  }, this);

  // this.option_values = _.map(task_cfg.option_values, function(option_value_cfg, tool_option_id) {
  //   return new TaskOptionValue(this, _.extend(option_value_cfg, {tool_option_id: tool_option_id}));
  // }, this);
  // this.input_assignments = _.map(task_cfg.input_assignments, function(input_assignment_cfg, tool_input_id) {
  //   return new TaskInputAssignment(this, _.extend(input_assignment_cfg, {tool_input_id: tool_input_id}));
  // }, this);

}
_.extend(Task.prototype, {

})

var TaskOption function(task, tool_option, option_value) {
  this.task = task;
  this.tool_option = tool_option;
  if(!_.isUndefined(option_value)) {
    this.option_value = option_value;
  }
  
}
_.extend(TaskOptionValue.prototype, {

})

var TaskInput = function(task, tool_input, input_assignment_cfg) {
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
_.extend(TaskOptionValue.prototype, {

})




var TaskOptionValue = function(task, task_option_cfg) {
}
_.extend(TaskOptionValue.prototype, {

})

var TaskInputAssignment = function(task, task_input_cfg) {
  var src = task_input_cfg.src;
  if('task_id' in src) {
    this.src = this.pipeline.getTask(src.task_id).getOutput(src.tool_output_id);
  } else if ('pipeline_input_id' in src) {
    this.src = this.pipeline.getInput(src.pipeline_input_id);
  } else if ('pipeline_output_id' in src) {
    this.src = this.pipeline.getOutput(src.pipeline_output_id);
  }
}
_.extend(TaskInputAssignment.prototype, {

})