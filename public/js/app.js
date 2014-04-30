
var RUNPL = true;
var dbg_parts = [];

function strJoin (sep, str_coll) {
    if (str_coll.length == 0) {
        return "";
    } else {
        var l = str_coll.length-1;
        x = str_coll.slice(0,l).reduce(
            function (S, s) {return S + s + sep;}, "");
        return x + str_coll[l];
    }
}


function taskOptions(task, tool) {
    var opts = task.option_value_assignments;
    //console.log(opts);
    var options =
        _.pairs(_.omit(opts, _.filter(_.keys(opts),
                                      function(k) {return !opts[k];})));
    options = _.flatten(tool.inputs_named ?
                        options :
                        _.map(options, function (pair) {
                            return (typeof pair[1] == "boolean") ?
                                pair[0] :
                                pair[1];
                        }));

    options = tool.flags_have_value ?
        options :
        _.filter(options, function(x) {return !(typeof x == "boolean");});

    return strJoin(" ", options);
}

function inputURL(input, pl_graph) {
    if ('pipeline_input_id' in input) {
        var pi_obj = {pipeline_input_id: input.pipeline_input_id};
        return _.find(pl_graph, pi_obj).data_URL;
    } else {
        var tsk_obj = {task_id: input.task_id};
        return encodeURIComponent(_.find(pl_graph, tsk_obj).task_URL);
    }
}

function taskInputs(task, pl_graph) {
    var inputs = task.input_src_assignments["-in"];
    return _.map(inputs, function(input){return inputURL(input, pl_graph);});
}


function constructTaskURL (task, pl_graph, pipeline) {
    var tool = _.find(pipeline.tools, {id: task.tool_id});

    var service_URL = tool.service_URL;
    var ws_service;
    var ws_URL;

    if (!tool.ws_URL) {
        var x = service_URL.split(":")[1].split("/?");
        ws_service = "ws:" + x[0];
        ws_URL = ws_service + "/?" + x[1];
        tool.ws_URL = ws_URL;
        tool.ws_service = ws_service;
    } else {
        ws_URL = tool.ws_URL;
        ws_service = tool.ws_service;
    };

    var param_loc = tool.param_loc;
    var input_sep = tool.inputs_named ? " -in " : " ";

    var options = taskOptions(task,tool);
    var inputs = taskInputs(task, pl_graph);
    var prefix = service_URL;
    var ws_prefix = ws_URL;
    var suffix = "";

    if (param_loc == "after-input") {
        suffix = " " + options;;
    } else {
        prefix = strJoin(" ", _.flatten([service_URL, options]));
        ws_prefix = strJoin(" ", _.flatten([ws_URL, options]));
    };

    url =  encodeURI(prefix +
                     strJoin(input_sep, [""].concat(inputs)) +
                     suffix);
    wsurl = encodeURI(ws_prefix +
                      strJoin(input_sep, [""].concat(inputs)) +
                      suffix);

    task.task_URL = url;
    task.task_ws_URL = wsurl;

    return {http_service: service_URL, http_url: url,
            ws_service: ws_service, ws_url: wsurl};
}


function constructPipelineURL (pipeline) {
    var pl_graph = pipeline.linearized_cfg_graph;
    var tasks = _.filter(pl_graph, function(cfg) {return ('task_id' in cfg);});
    var task_urls =
        _.map(tasks,
              function(task){
                  return constructTaskURL(task, pl_graph, pipeline);});
    return _.last(task_urls);
}


function ajaxRunPipeline (url) {
    $.ajax(
        url,
        {complete: function(xhr, status) {
            console.log("STATUS: " + status);
            samData = xhr.responseText;
            $("#monitor").append("<p>"+xhr.responseText+"</p>");
        },

         dataType: "text"});
}


function wsRunPipeline (ws_service) {
    var parts = [];
    $("#monitor").empty();
    var client = BinaryClient(ws_service);
    client.on('open', function() {
        console.log('hi');
        var stream = client.createStream(
            {event: 'run', params: {'url': app.pipeline.wsurl}});
        stream.on('data', function(data) {
            parts.push(data);});
        stream.on('end', function() {
	          dbg_parts = parts;
            console.log(parts);
            $("#monitor").append("<p>" + strJoin("\n", parts) + "</p>");
        });
    });
}



$(function(){

    _.extend(app, Backbone.Events);

    app.loadPipeline = function(pipeline) {
        app.stopListening(app.pipeline);
        app.pipeline = pipeline;
        app.global_view.showGraph(new GlobalGraph(app.pipeline));
        app.focusOn(app.pipeline.inputs);
        app.listenTo(app.pipeline, 'add:task', app.focusOn);
        app.listenTo(app.pipeline,
                     'change',
                     function() {
                         var pl_json =
                             LZString.compressToBase64(
                                 JSON.stringify(app.pipeline));
                         var xurl =
                             "edit_pipeline/" + encodeURIComponent(pl_json);

                         app.pipeline.pl_json = pl_json;
                         //console.log("NewURL = " + xurl);
                         //console.log(app.pipeline);
                         app.router.navigate(xurl);
                         app.runPipeline(app.pipeline, pl_json);
                     });
    }

    app.focusOn = function(datum) {
        var graph = (datum instanceof Task) ?
            new FocalTaskGraph(datum) :
            new FocalPipelineInputsGraph(app.pipeline);
        app.focal_view.showGraph(graph);
        app.global_view.focusDatum(datum);
    }

    app.router = new (Backbone.Router.extend(
        {routes:
         {"": function() {
             app.router.navigate("new_pipeline", {trigger: true});},

          "new_pipeline": "new_pipeline",
          "edit_pipeline/:pipeline_json": "edit_pipeline"
         },

         new_pipeline: function() {
             app.loadPipeline(new Pipeline());},

         edit_pipeline: function(pipeline_json) {
             var pl = new Pipeline(
                 JSON.parse(LZString.decompressFromBase64(pipeline_json)));
             app.loadPipeline(pl);
             app.runPipeline(pl, undefined);
         }
        }));

    app.runPipeline = function (pipeline, pl_json) {
        //console.log("RunPL: " + pl_json);

        if (pl_json) {
            pl_cfg = JSON.parse(LZString.decompressFromBase64(pl_json));
            pipeline.linearized_cfg_graph =
                pipeline._constructDependencyGraph(
                    pl_cfg.inputs, pl_cfg.tasks);
        }; // else, this call from edit_pipeline and already set

        var urls = constructPipelineURL(pipeline);
	if (urls) {
            pipeline.url = urls["http_url"];
            pipeline.wsurl = urls["ws_url"];
            pipeline.ws_service = urls["ws_service"];
            console.log(pipeline.url);
            if (RUNPL) {
		wsRunPipeline(pipeline.ws_service);
            };
	};
    }


    app.tool_library = new ToolLibrary(_.cloneDeep(server_data.tool_configs));

    app.global_view = new GlobalView({el: $("#global")});
    app.focal_view = new FocalView({el: $("#focal")});

    Backbone.history.start({pushState: true});
});
