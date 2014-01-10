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

  _.extend(app, Backbone.Events);

  app.pipeline_handler_URL = "/pipeline_handler?pipeline_json="; // the service that runs a pipeline from a provided JSON config

  //var components = _.cloneDeep(_.union(server_data.pipeline_configs, server_data.tool_configs))

  app.tool_library = new ToolLibrary(_.cloneDeep(server_data.tool_configs));

  var pipeline_JSON = $.url().param("pipeline");
  if(!_.isUndefined(pipeline_JSON)) {
    app.pipeline = new Pipeline(JSON.parse(pipeline_JSON));
  } else {
    //app.pipeline = new Pipeline(server_data.pipeline_configs[2]);
    app.pipeline = new Pipeline();
  }

  app.focusOn = function(datum) {
    var graph = (datum instanceof Task) ? new FocalTaskGraph(datum) : new FocalPipelineInputsGraph(app.pipeline);
    app.focal_view.showGraph(graph);
  }

  app.global_view = new GlobalView({el: $("#global")});
  app.focal_view = new FocalView({el: $("#focal")});

  app.global_view.showGraph(new GlobalGraph(app.pipeline)); 

  app.listenTo(app.pipeline, 'add:task', app.focusOn);
  //var monitor_view = new MonitorView(); 

  // start with focal view on pipeline inputs, then trigger pipeline input creation
  // start with global view in task selection mode
  // when adding existing datum as a task input source, global view enters datum selection mode

});
