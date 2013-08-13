var ComponentLibrary = function(cmpt_cfgs) {

  _.each(cmpt_cfgs, function(cmpt_cfg){
    if(!this.hasStoredComponent(cmpt_cfg.name) ) {
      this.saveComponentFromConfig(cmpt_cfg);
    }
  }, this);

  // PRIVATE
  this._components = this._loadComponents();

}
_.extend(Object.create(Array.prototype), {
  // PUBLIC
  getComponentNames: function(type) {
    return _(localStorage).keys()
           .filter(function(key) {return key.lastIndexOf(type+":", 0) === 0; })
           .map(function(key){return key.splice(0, type.length+1);})
           .sortBy('name');
  },

  // need public functions to add/remove component so we get persistence.

  // PRIVATE
  _saveComponentFromConfig: function(cmpt_cfg) {
    localStorage[cmpt_cfg.component_type+":"+cmpt_cfg.name] = JSON.stringify(cmpt_cfg);
  },
  _hasStoredComponent: function(name) {
    return _(["tool", "pipeline"]).any(function(type) {return _(localStorage).has(type+":"+name);} );
  },
  _loadComponents: function() {
    return _(localStorage).keys()
           .filter(function(key) {return key.lastIndexOf("tool:", 0) === 0 || key.lastIndexOf("pipeline:", 0) === 0; })
           .map(function(key){return JSON.parse(localStorage[key]); })
           .map(function(cmpt_cfg){
              if(cmpt_cfg.component_type === 'tool') {
                return new Tool(cmpt_cfg);
              } else if (cmpt_cfg.component_type === 'pipeline') {
                return new Pipeline(cmpt_cfg);
              }
           });
  }
})