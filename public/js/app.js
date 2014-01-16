$(function(){

  _.extend(app, Backbone.Events);

  app.loadPipeline = function(pipeline) {
    app.stopListening(app.pipeline);
    app.pipeline = pipeline;
    app.global_view.showGraph(new GlobalGraph(app.pipeline));
    app.focusOn(app.pipeline.inputs);
    app.listenTo(app.pipeline, 'add:task', app.focusOn);
    app.listenTo(app.pipeline, 'change', function() {
      app.router.navigate("edit_pipeline/"+encodeURIComponent(LZString.compressToBase64(JSON.stringify(app.pipeline))));
    });
  }

  app.focusOn = function(datum) {
    var graph = (datum instanceof Task) ? new FocalTaskGraph(datum) : new FocalPipelineInputsGraph(app.pipeline);
    app.focal_view.showGraph(graph);
    app.global_view.focusDatum(datum);
  }

  app.router = new (Backbone.Router.extend({
    routes: {
      "": function() { app.router.navigate("new_pipeline", {trigger: true}); },
      "new_pipeline": "new_pipeline",
      "edit_pipeline/:pipeline_json": "edit_pipeline"
    },
    new_pipeline: function() {
      app.loadPipeline(new Pipeline());
    },
    edit_pipeline: function(pipeline_json) {
      app.loadPipeline(new Pipeline(JSON.parse(LZString.decompressFromBase64(pipeline_json))));
    },
  }));

  app.tool_library = new ToolLibrary(_.cloneDeep(server_data.tool_configs));

  app.global_view = new GlobalView({el: $("#global")});
  app.focal_view = new FocalView({el: $("#focal")});

  Backbone.history.start({pushState: true});


});
