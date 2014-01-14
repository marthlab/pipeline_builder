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

  app.loadPipeline = function(pipeline) {
    app.stopListening(app.pipeline);
    app.pipeline = pipeline;
    app.global_view.showGraph(new GlobalGraph(app.pipeline));
    app.focusOn(app.pipeline.inputs);
    app.listenTo(app.pipeline, 'add:task', app.focusOn);
  }

  app.focusOn = function(datum) {
    var graph = (datum instanceof Task) ? new FocalTaskGraph(datum) : new FocalPipelineInputsGraph(app.pipeline);
    app.focal_view.showGraph(graph);
  }

  app.pipeline_handler_URL = "/pipeline_handler?pipeline_json="; // the service that runs a pipeline from a provided JSON config

  app.tool_library = new ToolLibrary(_.cloneDeep(server_data.tool_configs));

  app.global_view = new GlobalView({el: $("#global")});
  app.focal_view = new FocalView({el: $("#focal")});

  var pipeline_JSON = $.url().param("pipeline");
  app.loadPipeline(_.isUndefined(pipeline_JSON) ? new Pipeline() : new Pipeline(JSON.parse(pipeline_JSON)));

});
