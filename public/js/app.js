var piper = {};

// amalgamate tool data from server and from client localStorage
var local_tool_configs = JSON.parse(localStorage.getItem("tools")) || [];
var local_tool_configs_not_in_server_data = local_tools.filter(function(local_tc){
  !_.some(server_data.tool_configs, function(server_tc){ _.isEqual(local_tc, server_tc); })
});
var tools_data = _.union(server_data.tool_configs, local_tool_configs_not_in_server_data);

var tool_library = new ToolLibrary(_.cloneDeep(tools_data));

var pipelines_data = server_data.pipelines;
if(localStorage.getItem("pipelines")) {
  _.extend(pipelines_data, JSON.parse(localStorage.getItem("pipelines")));
}



var pipeline_library = new PipelineLibrary(_.cloneDeep(pipelines_data));


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