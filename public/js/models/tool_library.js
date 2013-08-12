var ToolLibrary = function(tool_cfgs) {

  var stored_tool_cfgs = JSON.parse(localStorage.getItem("tools")) || [];
  var tool_cfgs = _.uniq(
    _.union(tool_cfgs, stored_tool_cfgs),
    function(tool_cfg) { return _.stableStringify(tool_cfg); }
  );

  this.setToolsFromConfigs(tool_cfgs);

  
}
_.extend(ToolLibrary.prototype, {

  // GET RID OF TOOL DISPLAY NAME IDEA: allow for client tool and pipeline libraries, along with tool and pipeline libraries inside of each pipeline.
  // when you load a pipeline, create a components library just for that tool. you can then move components to and from the client library, but you get naming collision warnings.

  // get_or_create_tool: function(tool_cfg) {
  //   return this.getTool(tool_cfg) 
  // },
  getTool: function(tool_cfg) {
    return _.find(this.tools, function(tool) { return _.isEqual(tool_cfg, JSON.parse(JSON.stringify(tool))); }) || this.addTool(tool_cfg);
  },
  // containsTool: function(tool_cfg) {
  //   return !_.isUndefined(this.getTool(tool_cfg));
  // },
  toolDisplayName: function(tool) {
    var num_prior_isonymous_tools = _(_.first(this.tools, _.indexOf(this.tools, tool))).filter(function(prior_tool){return prior_tool.name === tool.name;}).length;
    return tool.name+(num_prior_isonymous_tools > 0 ? " ("+num_prior_isonymous_tools+")" : "");
  },
  addTool: function(tool_cfg) {
    var tool = new Tool(tool_cfg);
    var isonymous_tools = _.filter(this.tools, function(other_tool) {return other_tool.name === tool.name; });
    if(_.isEmpty(isonymous_tools)) {
      var insert_index = _.sortedIndex(this.tools, tool, "name");
    } else {
      var insert_index = _.indexOf(this.tools, _.last(isonymous_tools)) + 1;
    }
    this.tools.splice(insert_index, 0, tool);
    this.save();
    return tool;
  },
  setToolsFromConfigs: function(tool_cfgs) {
    this.tools = _.sortBy(
      _.map(tool_cfgs, function(tool_cfg) { return new Tool(tool_cfg); }),
      "name"
    );
    this.save();
  },
  save: function() {
    localStorage.setItem("tools", JSON.stringify(this.tools));
  }
})