var piper = {};

piper.pipeline_handler_URL = "/pipeline_handler?pipeline_json="; // the service that runs a pipeline from a provided JSON config

var components = _.cloneDeep(_.union(server_data.pipeline_configs, server_data.tool_configs))

var component_library = new ComponentLibrary(components);





// var PipelineApp = new Backbone.Marionette.Application();

// PipelineApp.on("initialize:after", function(){
//   console.log("PipelineApp has started!");

//   var test_tool = new PipelineApp.Tool({'hai':'2u'});

//   PipelineApp.ToolLibrary.add(builder_data.tools);
//   PipelineApp.PipelineLibrary.add(builder_data.pipelines);

//   //debugger;

// });



// PipelineApp.addRegions({
//   editorRegion: "#editor",
//   widgetsRegion: "#widgets"
// });

// PipelineApp.Tool = Backbone.Model.extend({});
// PipelineApp.Pipeline = Backbone.Model.extend({});

// PipelineApp.ToolList = Backbone.Collection.extend({
//   model: PipelineApp.Tool
// });

// PipelineApp.PipelineList = Backbone.Collection.extend({
//   model: PipelineApp.Pipeline
// });

// PipelineApp.ToolLibrary = new PipelineApp.ToolList();
// PipelineApp.PipelineLibrary = new PipelineApp.PipelineList();

// // A Grid Row
// var GridRow = Backbone.Marionette.ItemView.extend({
//   template: "#row-template",
//   tagName: "tr"
// });

// // The grid view
// var GridView = Backbone.Marionette.CompositeView.extend({
//   tagName: "table",
//   template: "#grid-template",
//   itemView: GridRow,
  
//   appendHtml: function(collectionView, itemView){
//     collectionView.$("tbody").append(itemView.el);
//   }
// });

// PipelineApp.start();

// plan

// buid models and collections