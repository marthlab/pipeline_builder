var ComponentCollection = function(parent, cmpt_cfgs) {

  _.each(cmpt_cfgs, function(cmpt_cfg){
    if(!this.hasPipelineWithName(pl_cfg.name) ) {
      this.savePipelineFromConfig(pl_cfg);
    }
  }, this);

}
_.extend(PipelineLibrary.prototype, {
  getPipelineNames: function() {
    return _.map(_.filter(Object.keys(localStorage), function(key) {
      return key.lastIndexOf("pipeline:", 0) === 0; //test for prefix
    }), function(key){return key.splice(0, 9); });
  },
  savePipelineFromConfig: function(pl_cfg) {
    localStorage.setItem("pipeline:"+pl_cfg.name, JSON.stringify(pl_cfg));
  },
  hasPipelineWithName: function(name) {
    return !!localStorage.getItem("pipeline:"+name);
  },
  getPipeline: function(name) {
    return new Pipeline(JSON.parse(localStorage.getItem("pipeline:"+name)));
  }
})