_.mixin({  
  methodMap: function(collection, methodName, thisArg) {
    return _.map(collection, function(value) {
      return value[methodName].call(thisArg);
    }, thisArg);
  },
  methodFilter: function(collection, methodName, thisArg) {
    return _.filter(collection, function(value) {
      return value[methodName].call(thisArg);
    }, thisArg);
  }  
});

Array.prototype.pushArray = function(arr) {
  this.push.apply(this, arr);
};

var pipeline_handler_URL = "/pipeline_handler?pipeline_json="; // the service that runs a pipeline from a provided JSON config

//var components = _.cloneDeep(_.union(server_data.pipeline_configs, server_data.tool_configs))

var tool_library = new ToolLibrary(_.cloneDeep(server_data.tool_configs));

var pipeline_JSON = $.url().param("pipeline");
if(!_.isUndefined(pipeline_JSON)) {
  var pipeline = new Pipeline(JSON.parse(pipeline_JSON));
} else {
  var pipeline = new Pipeline();
}

var global_view = new GlobalView();
var focal_view = new FocalView();
var monitor_view = new MonitorView(); 