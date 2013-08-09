// here we assume the data is valid; this should be checked prior to instantiating business objects

var Tool = function(tool_data) {
  this.name = tool_data.name;
  this.options = _.map(tool_data.options, function(option_data, option_id) {
    return new ToolOption(this, _.extend(option_data, {id: option_id}));
  }, this);
  this.inputs = _.map(tool_data.inputs, function(input_data, input_id) {
    return new ToolInput(this, _.extend(input_data, {id: input_id}));
  }, this);
  this.outputs = _.map(tool_data.outputs, function(output_data, output_id) {
    return new ToolOutput(this, _.extend(output_data, {id: output_id}));
  }, this);
}
_.extend(Tool.prototype, {
  toJSON: function() {
    return {
      name: this.name,
      options: _.object(_.pluck(this.options, "id"), _.map(this.options, function(option) {return _.omit(option, ["id", "tool"]);})),
      inputs: _.object(_.pluck(this.inputs, "id"), _.map(this.inputs, function(input) {return _.omit(input, ["id", "tool"]);})),
      outputs: _.object(_.pluck(this.outputs, "id"), _.map(this.outputs, function(output) {return _.omit(output, ["id", "tool"]);}))
    };
  }
})

var ToolOption = function(tool, tool_option_data) {
  this.tool = tool;
  this.id = tool_option_data.id;
  this.description = tool_option_data.description;
  this.required = tool_option_data.required;
  this.type = tool_option_data.type;
  this.default = tool_option_data.hasOwnProperty("default") ? tool_option_data.default : undefined;
}
_.extend(ToolOption.prototype, {
  
})

var ToolInput = function(tool, tool_input_data) {
  this.tool = tool;
  this.id = tool_input_data.id;
  this.legal_file_extensions = tool_input_data.legal_file_extensions;
  this.required = tool_input_data.required;
  this.accepts_multiple = tool_input_data.accepts_multiple;
}
_.extend(ToolInput.prototype, {
  
})

var ToolOutput = function(tool, tool_output_data) {
  this.tool = tool;
  this.id = tool_output_data.id;
  this.file_extension = tool_output_data.file_extension;
}
_.extend(ToolOutput.prototype, {
  
})