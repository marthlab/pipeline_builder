var ToolLibrary = function(tools_data) {
  this.tools = _.sortBy(
    _.map(tools_data, function(tool_data) { return new Tool(tool_data); }),
    "name"
  );
}
_.extend(ToolLibrary.prototype, {
  containsTool: function(tool_config) {
    return _.some(this.tools, function(tool) { return _.isEqual(tool_config, JSON.parse(JSON.stringify(tool))); });
  },
  toolDisplayName: function(tool) {
    var num_prior_homonymous_tools = _(_.first(this.tools, _.indexOf(this.tools, tool))).filter(function(prior_tool){return prior_tool.name === tool.name;}).length;
    return tool.name+(num_prior_homonymous_tools > 0 ? " ("+num_prior_homonymous_tools+")" : "");
  },
  addTool: function(tool) {
    var homonymous_tools = _.filter(this.tools, function(other_tool) {return other_tool.name === tool.name; });
    if(_.isEmpty(homonymous_tools)) {
      var insert_index = _.sortedIndex(this.tools, tool, "name");
    } else {
      var insert_index = _.indexOf(this.tools, _.last(homonymous_tools)) + 1;
    }
    this.tools.splice(insert_index, 0, tool);
    this.persist();
  },
  persist: function() {
    localStorage.setItem("tools", JSON.stringify(this.tools));
  }
})