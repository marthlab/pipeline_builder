_.mixin({
  methodEach: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    _.each(collection, function(value) {
      value[method_name].apply(value, method_args);
    });
    return collection;
  },
  methodMap: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.map(collection, function(value) {
      return value[method_name].apply(value, method_args);
    });
  },
  methodFilter: function(collection, method_name) {
    var method_args = Array.prototype.slice.call(arguments, 2, arguments.length);
    return _.filter(collection, function(value) {
      return value[method_name].call(value, method_args);
    });
  },
  pushArray: function(array, items_to_push) {
    array.push.apply(array, items_to_push);
  }
});

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
};

function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
}

$(function(){

  var app = {};

  app.pipeline_handler_URL = "/pipeline_handler?pipeline_json="; // the service that runs a pipeline from a provided JSON config

  //var components = _.cloneDeep(_.union(server_data.pipeline_configs, server_data.tool_configs))

  app.tool_library = new ToolLibrary(_.cloneDeep(server_data.tool_configs));

  var pipeline_JSON = $.url().param("pipeline");
  if(!_.isUndefined(pipeline_JSON)) {
    app.pipeline = new Pipeline(JSON.parse(pipeline_JSON));
  } else {
    app.pipeline = new Pipeline(server_data.pipeline_configs[2]);
  }

  app.global_view = new GlobalView({el: $("#global"), app: app});
  //app.focal_view = new FocalView({el: $("#focal"), app: app});
  //var monitor_view = new MonitorView(); 

});
