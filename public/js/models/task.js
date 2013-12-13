function Task(pipeline, task_cfg) {

  this.pipeline = pipeline;
  this.id = task_cfg.task_id;
  
  if(!this.pipeline.hasTool(task_cfg.tool_id)) {
    this.pipeline.addTool( app.tool_library.getTool(task_cfg.tool_id) );
  }
  this.tool = this.pipeline.getTool(task_cfg.tool_id);

  this.options = _.map(this.tool.options || [], function(tool_option) {
    return new TaskOption(this, tool_option, task_cfg.option_value_assignments && _.find(task_cfg.option_value_assignments, function(value_assignment, tool_option_id){
      return tool_option_id === tool_option.id;
    }));
  }, this);
  this.inputs = _.map(this.tool.inputs || [], function(tool_input) {
    return new TaskInput(this, tool_input, task_cfg.input_src_assignments && task_cfg.input_src_assignments[tool_input.id]);
  }, this);
  this.outputs = _.map(this.tool.outputs || [], function(tool_output) {
    return new TaskOutput(this, tool_output, task_cfg.output_format_assignments && task_cfg.output_format_assignments[tool_output.id]);
  }, this);

}
_.extend(Task.prototype, {
  toJSON: function() {
    var assigned_options = _.methodFilter(this.options, "isAssignedValue");
    var assigned_inputs = _.methodFilter(this.inputs, "isAssignedSrc");
    return {
      tool_id: this.tool.id,
      option_value_assignments: _.object(
        _.pluck(_.pluck(assigned_options, "tool_option"), "id"),
        _.pluck(assigned_options, 'value')
      ),
      input_src_assignments: _.object(
        _.pluck(_.pluck(assigned_inputs, "tool_input"), "id"),
        _.map(assigned_inputs, function(output){
          var src = output.src;
          if(src instanceof TaskOutput) {
            return {task_id: src.task.id, tool_output_id: src.tool_output.id};
          } else if(src instanceof PipelineInput) {
            return {pipeline_input_id: src.id};
          }
        })
      )
    };
  },
  getOutput: function(tool_output_id) {
    return _.findExact(this.outputs, {tool_output: this.tool.getOutput(tool_output_id)}, this);
  },
  getOutputsWithAssignedFormat: function() {
    return _.methodFilter(this.outputs, 'isAssignedFormat');
  },
  getOutputsWithoutAssignedFormat: function() {
    return _.methodReject(this.outputs, 'isAssignedFormat');
  },
  hasAsInputSource: function(item) {
    return _.methodSome(this.inputs, 'hasAsSource', item);
  },
  isFinalized: function() {
    return this.allRequiredInputsAssigned() && this.allOutputFormatsSpecified();
  },
  allRequiredInputsAssigned: function() {
    return _.methodEvery(_.filter(this.inputs, 'required'), 'isAssignedSource');
  },
  allOutputFormatsSpecified: function() {
    return _.methodEvery(this.outputs, 'isAssignedFormat');
  },
  getOptionsByCategory: function() {
    return _.groupBy(this.options, function(task_option){return task_option.tool_option.category; });
  },
  getOptionById: function(id) {
    return _.find(this.options, function(task_option) {return task_option.tool_option.id === id; });
  }
});

function TaskOption(task, tool_option, option_val) {
  this.task = task;
  this.tool_option = tool_option;

  if(this.tool_option.type === 'flag') {
    this.value = _.assignWithDefault(option_val, false);
  } else {
    this.value = _.assignWithDefault(option_val, '');
  }
  
}
_.extend(TaskOption.prototype, {
  
})

function TaskInput(task, tool_input, input_src_assignment_cfg) {
  this.task = task;
  this.tool_input = tool_input;

  if(!_.isUndefined(input_src_assignment_cfg)) {
    this.sources = _.isArray(input_src_assignment_cfg) ?
      _.map(input_src_assignment_cfg, _.bind(this._getSourceFromCfg, this)) : [this._getSourceFromCfg(input_src_assignment_cfg)];
  } else {
    this.sources = [];
  }

}
_.extend(TaskInput.prototype, {
  _getSourceFromCfg: function(cfg) {
    if('task_id' in cfg && 'tool_output_id' in cfg) {
      return this.task.pipeline.getTask(cfg.task_id).getOutput(cfg.tool_output_id);
    } else if ('pipeline_input_id' in cfg) {
      return this.task.pipeline.getInput(cfg.pipeline_input_id);
    }
  },
  isAssignedSource: function() {
    return this.sources.length > 0;
  },
  isSaturated: function() {
    return !this.tool_input.accepts_multiple && this.isAssignedSource();
  },
  hasAsSource: function(item) {
    return _.contains(this.sources, item);
  },
  acceptsFormat: function(format) {
    return this.tool_input.acceptsFormat(format);
  },
  acceptsFormatOf: function(datum) {
    return this.acceptsFormat(datum.getFormat());
  },
  acceptsMultiple: function() {
    return this.tool_input.accepts_multiple;
  },
  compatibleWithMultiplicityOf: function(datum) {
    return this.acceptsMultiple() || !datum.providesMultiple();
  },
  getPotentialSources: function() {
    if(this.isSaturated()) return [];

    return _.union(this.task.pipeline.inputs, this.task.pipeline.getTaskOutputs()).filter(function(datum){
      return !this.hasAsSource(datum) && this.acceptsFormatOf(datum) && this.compatibleWithMultiplicityOf(datum);
    }, this);
  },
  hasPotentialSources: function() {
    return this.getPotentialSources().length > 0;
  }
})

function TaskOutput(task, tool_output, format) {
  this.task = task;
  this.tool_output = tool_output;
  if(!_.isUndefined(format)) {
    this.format = format;
  } else if(this.getAvailableFormats().length === 1) {
    this.format = this.getAvailableFormats()[0];
  } else {
    this.format = null;
  }

}
_.extend(TaskOutput.prototype, {
  isAssignedFormat: function() {
    return !_.isUndefined(this.format); // format set to null counts as defined
  },
  getAvailableFormats: function() {
    return this.tool_output.available_formats;
  },
  getFormat: function() {
    return this.format;
  },
  providesMultiple: function() {
    return this.tool_output.provides_multiple;
  },
  getFocalParentObject: function() {
    return this.task;
  }
})