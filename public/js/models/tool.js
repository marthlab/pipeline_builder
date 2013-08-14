// here we assume the cfg is valid; this should be checked prior to instantiating business objects

var Tool = function(tool_cfg) {
  this.id = tool_cfg.id;
  this.service_URL = tool_cfg.service_URL || undefined;

  this.options = _.map(tool_cfg.options, function(option_cfg, option_id) {
    return new ToolOption(this, _.extend(option_cfg, {id: option_id}));
  }, this);
  this.inputs = _.map(tool_cfg.inputs, function(input_cfg, input_id) {
    return new ToolInput(this, _.extend(input_cfg, {id: input_id}));
  }, this);
  this.outputs = _.map(tool_cfg.outputs, function(output_cfg, output_id) {
    return new ToolOutput(this, _.extend(output_cfg, {id: output_id}));
  }, this);
}
_.extend(Tool.prototype, {
  toJSON: function() {
    return {
      id: this.id,
      component_type: 'tool',
      service_URL: this.service_URL,
      options: _.object(_.pluck(this.options, "id"), _.map(this.options, _.partialRight(_.omit, ["id", "tool"]))),
      inputs: _.object(_.pluck(this.inputs, "id"), _.map(this.inputs, _.partialRight(_.omit, ["id", "tool"]))),
      outputs: _.object(_.pluck(this.outputs, "id"), _.map(this.outputs, _.partialRight(_.omit, ["id", "tool"])))
    };
  }
})

var ToolOption = function(tool, tool_option_cfg) {
  this.tool = tool;
  this.id = tool_option_cfg.id;
  this.description = tool_option_cfg.description;
  this.required = tool_option_cfg.required;
  this.type = tool_option_cfg.type;
  this.default = tool_option_cfg.hasOwnProperty("default") ? tool_option_cfg.default : undefined;
}
_.extend(ToolOption.prototype, {
  
})

var ToolInput = function(tool, tool_input_cfg) {
  this.tool = tool;
  this.id = tool_input_cfg.id;
  this.legal_file_extensions = tool_input_cfg.legal_file_extensions;
  this.required = tool_input_cfg.required;
  this.accepts_multiple = tool_input_cfg.accepts_multiple;
}
_.extend(ToolInput.prototype, {
  
})

var ToolOutput = function(tool, tool_output_cfg) {
  this.tool = tool;
  this.id = tool_output_cfg.id;
  this.file_extension = tool_output_cfg.file_extension;
}
_.extend(ToolOutput.prototype, {
  
})