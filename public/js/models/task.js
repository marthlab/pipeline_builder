var Task = function(pipeline, task_cfg) {

  this.pipeline = pipeline;
  this.id = task_cfg.task_id;
  this.component = this.pipeline.getComponent(task_cfg.component_id);

  this.options = _.map(this.component.options || [], function(component_option) {
    return new TaskOption(this, component_option, task_cfg.option_values[component_option.id]);
  }, this);
  this.inputs = _.map(this.component.inputs || [], function(component_input) {
    return new TaskInput(this, component_input, task_cfg.input_assignments[component_input.id]);
  }, this);
  this.outputs = _.map(this.component.outputs || [], function(component_output) {
    return new TaskOutput(this, component_output);
  }, this);

}
_.extend(Task.prototype, {
  toJSON: function() {
    return {

    };
  },
  getOutput: function(output_id) {
    return _.find(this.outputs, {id: output_id});
  }
});

var TaskOption = function(task, component_option, option_value) {
  this.task = task;
  this.component_option = component_option;
  if(!_.isUndefined(option_value)) {
    this.option_value = option_value;
  }
  
}
_.extend(TaskOption.prototype, {

})

var TaskInput = function(task, component_input, input_assignment_cfg) {
  this.task = task;
  this.component_input = component_input;
  if(!_.isUndefined(input_assignment_cfg)) {
    var src = input_assignment_cfg.src;
    if('task_id' in src && 'component_output_id' in src) {
      this.src = this.task.pipeline.getTask(src.task_id).getOutput(src.component_output_id);
    } else if ('pipeline_input_id' in src) {
      this.src = this.task.pipeline.getInput(src.pipeline_input_id);
    }
  }

}
_.extend(TaskInput.prototype, {

})

var TaskOutput = function(task, component_output) {
  this.task = task;
  this.component_output = component_output;

}
_.extend(TaskOutput.prototype, {

})