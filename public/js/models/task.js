function Task(pipeline, task_cfg) {

  this.pipeline = pipeline;
  this.id = task_cfg.task_id;
  this.component = this.pipeline.getComponent(task_cfg.component_id);

  this.options = _.map(this.component.options || [], function(component_option) {
    return new TaskOption(this, component_option, task_cfg.option_assignments[component_option.id]);
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
    var assigned_options = _.methodFilter(this.options, "isAssigned");
    var assigned_inputs = _.methodFilter(this.inputs, "isAssigned");
    return {
      component_id: this.component.id,
      option_assignments: _.object(
        _.pluck(_.pluck(assigned_options, "component_option"), "id"),
        _.map(assigned_options, function(option){
          if('src' in option) {
            return {src:{pipeline_option_id: option.src.id}};
          } else if('value' in option) {
            return {value: option.value};
          }
        })
      ),
      input_assignments: _.object(
        _.pluck(_.pluck(assigned_inputs, "component_input"), "id"),
        _.map(assigned_inputs, function(output){
          var src = output.src;
          if(src.constructor === TaskOutput) {
            return {src:{task_id: src.task.id, component_output_id: src.component_output.id}};
          } else if(src.constructor === PipelineInput) {
            return {src:{pipeline_input_id: src.id}};
          }
        })
      )
    };
  },
  getOutput: function(component_output_id) {
    return _.find(this.outputs, {component_output: this.component.getOutput(component_output_id)}, this);
  }
});

function TaskOption(task, component_option, option_assignment_cfg) {
  this.task = task;
  this.component_option = component_option;
  if(!_.isUndefined(option_assignment_cfg)) {
    if('src' in option_assignment_cfg) {
      this.src = this.task.pipeline.getOption(option_assignment_cfg.src.pipeline_option_id);
    } else if ('value' in option_assignment_cfg) {
      this.value = option_assignment_cfg.value;
    }
  }
}
_.extend(TaskOption.prototype, {
  isAssigned: function() { return !_.isUndefined(this.value) || !_.isUndefined(this.src); }
})

function TaskInput(task, component_input, input_assignment_cfg) {
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
  isAssigned: function() { return !_.isUndefined(this.src); }
})

function TaskOutput(task, component_output) {
  this.task = task;
  this.component_output = component_output;

}
_.extend(TaskOutput.prototype, {

})