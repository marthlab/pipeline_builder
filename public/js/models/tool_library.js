var ToolLibrary = function(cmpt_cfgs) {
  
  _.each(cmpt_cfgs, function(cmpt_cfg){
    if(!this._hasStoredTool(cmpt_cfg.id) || true) { // always overwrite in development
      this._saveToolFromConfig(cmpt_cfg);
    }
  }, this);

  // PRIVATE
  this._tools = this._loadTools();

}
_.extend(ToolLibrary.prototype, {
  // PUBLIC
  toolNames: function() {
    return _(localStorage).keys()
           .filter(function(key) {return key.lastIndexOf("tool:", 0) === 0; })
           .map(function(key){return key.splice(0, type.length+1);})
           .sortBy('id');
  },
  getToolsAcceptingFileExt: function(file_ext) {
    return _.filter(this._tools, function(tool) {return tool.acceptsFileExtension(file_ext);});
  },

  // need public functions to add/remove tool so we get persistence.

  // PRIVATE
  _saveToolFromConfig: function(tool_cfg) {
    localStorage["tool:"+tool_cfg.id] = _.stableStringify(tool_cfg);
  },
  _hasStoredTool: function(id) {
    return _(localStorage).has("tool:"+id);
  },
  _loadTools: function() {
    return _(localStorage).keys()
           .filter(function(key) {return key.lastIndexOf("tool:", 0) === 0; })
           .map(function(key){return JSON.parse(localStorage[key]); })
           .map(function(tool_cfg){
              return new Tool(tool_cfg);
           }).value();
  }
})