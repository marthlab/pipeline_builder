window.onerror = function(msg, url, line){
  console.log({ msg: msg, url: url, line: line });
};

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

  app.pipeline_handler_URL = "/pipeline_handler?pipeline_json="; // the service that runs a pipeline from a provided JSON config

  //var components = _.cloneDeep(_.union(server_data.pipeline_configs, server_data.tool_configs))

  app.tool_library = new ToolLibrary(_.cloneDeep(server_data.tool_configs));

  var pipeline_JSON = $.url().param("pipeline");
  if(!_.isUndefined(pipeline_JSON)) {
    app.pipeline = new Pipeline(JSON.parse(pipeline_JSON));
  } else {
    app.pipeline = new Pipeline(server_data.pipeline_configs[1]);
  }

  app.global_view = new GlobalView({el: $("#global")});
  app.focal_view = new FocalView({el: $("#focal")});
  //var monitor_view = new MonitorView(); 

});
