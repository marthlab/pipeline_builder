// here we assume the cfg is valid; this should be checked prior to instantiating business objects

function Tool(tool_cfg) {
  this.id = tool_cfg.id;
  this.package = tool_cfg.package || undefined;
  this.description = tool_cfg.description || '';
  this.service_URL = tool_cfg.service_URL || undefined;

  this.options = _.flatten(_.map(tool_cfg.options, function(category_option_cfgs, category) {
    return _.map(category_option_cfgs, function(option_cfg, option_id){
      return new ToolOption(this, _.extend(option_cfg, {id: option_id, category: category}));
    }, this);
  }, this));
  this.inputs = _.map(tool_cfg.inputs, function(input_cfg, input_id) {
    return new ToolInput(this, _.extend(input_cfg, {id: input_id}));
  }, this);
  this.outputs = _.map(tool_cfg.outputs, function(output_cfg, output_id) {
    return new ToolOutput(this, _.extend(output_cfg, {id: output_id}));
  }, this);
}
_.extend(Tool.prototype, {
  constructor: Tool,
  toJSON: function() {
    return {
      id: this.id,
      service_URL: this.service_URL,
      options: _.object(_.pluck(this.options, "id"), _.map(this.options, _.partialRight(_.omit, ["id", "tool"]))),
      inputs: _.object(_.pluck(this.inputs, "id"), _.map(this.inputs, _.partialRight(_.omit, ["id", "tool"]))),
      outputs: _.object(_.pluck(this.outputs, "id"), _.map(this.outputs, _.partialRight(_.omit, ["id", "tool"])))
    };
  },
  getInput: function(input_id) {
    return _.find(this.inputs, {id: input_id});
  },
  getOutput: function(output_id) {
    return _.find(this.outputs, {id: output_id});
  },
  getOption: function(option_id) {
    return _.find(this.options, {id: option_id});
  },
  // getCategoryOptions: function(category) {
  //   return _.find(this.options, {category: category});
  // },
  // getOptionsByCategory: function(category) {
  //   return _.groupBy(this.options, 'category');
  // },
  acceptsFormatForSuggestableInput: function(format) {
    return _.methodSome(_.filter(this.inputs, 'suggestable'), 'acceptsFormat', format);
  },
  // acceptsFormat: function(format) {
  //   return _.methodSome(this.inputs, 'acceptsFormat', format);
  // }
})

function ToolOption(tool, tool_option_cfg) {
  this.tool = tool;
  this.id = tool_option_cfg.id;
  this.description = tool_option_cfg.description;
  this.default = tool_option_cfg.default;
  this.type = tool_option_cfg.type;
}
_.extend(ToolOption.prototype, {
  
})

function ToolInput(tool, tool_input_cfg) {
  this.tool = tool;
  this.id = tool_input_cfg.id;
  this.formats_whitelist = _.assignWithDefault(tool_input_cfg.formats_whitelist, []);
  this.optional = _.assignWithDefault(tool_input_cfg.optional, false)
  this.accepts_multiple = _.assignWithDefault(tool_input_cfg.accepts_multiple, false)
  this.suggestable = _.assignWithDefault(tool_input_cfg.suggestable, true)
}
_.extend(ToolInput.prototype, {
  acceptsFormat: function(format) {
    return _.isUndefined(this.formats_whitelist) || _.contains(this.formats_whitelist, format);
  }
})

function ToolOutput(tool, tool_output_cfg) {
  this.tool = tool;
  this.id = tool_output_cfg.id;
  this.available_formats = _.assignWithDefault(tool_output_cfg.available_formats, []);
  this.provides_multiple = _.assignWithDefault(tool_output_cfg.provides_multiple, false);
}
_.extend(ToolOutput.prototype, {
  
})