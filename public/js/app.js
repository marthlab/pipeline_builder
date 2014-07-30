
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


function bamSampleUrl (pl_input, bamurl) {
    //console.log("SAMPLE: ", bamurl);
    if (!pl_input.bamObj) {
        var bam = new Bam(bamurl);
        pl_input.bamObj = bam;

        var deferred = $.Deferred(
          bam.getHeader(function (header) {
            pl_input.SQ = header.sq;
            //console.log("Resolving Deferred: ", deferred);
            deferred.resolve()}));
        var res = deferred.then(function(_) {
            bam.estimateBaiReadDepth(function(id, points) {})
        }).then(function (_) {
            bam.sampleStats(function (data) {});
        }).then(function (_) {
            pl_input.regionInfo = bam.samplingRegions(pl_input.SQ, {});
        }).then(function (_) {
            return bam._getBamRegionsUrl(pl_input.regionInfo.regions);
        });

        res.done(function (url) {
          pl_input.rawSampleUrl = url;
          pl_input.sampleUrl = encodeURIComponent(url);
          return pl_input.sampleUrl;
        });

        // NOTE - when res is finally fully resolved, it will
        // be the actual encoded URL (starts here as a deferred).
        pl_input.sampleUrl = res;
    };
    return pl_input.sampleUrl;
}

function inputURL(input, pl_graph, pipeline) {
    if ('pipeline_input_id' in input) {
        var pl_input = pipeline.getInput(input.pipeline_input_id);
        var fmt = pl_input.getFormat();
        var pi_pred = {pipeline_input_id: input.pipeline_input_id};
        var url = _.find(pl_graph, pi_pred).data_URL;
        url = (fmt == "bam") ? bamSampleUrl(pl_input, url) : url;
        return url;
    } else {
        // A task is input (i.e., its output is input)
        // Set run flag to false as task as input => no explicit run.
        // UNLESS - it is also in a viz panel
        var pltask = pipeline.getTask(input.task_id);
        pltask.runit = (pltask.viz_panel) ? true : false;

        var pl_graph_tsk_obj = _.find(pl_graph, {task_id: input.task_id});
        return encodeURIComponent(pl_graph_tsk_obj.task_URL);
    }
}

function taskInputs(task, pl_graph, pipeline) {
    var inputs = task.input_src_assignments["-in"];
    return _.map(inputs,
                 function(input) {
                     return inputURL(input, pl_graph, pipeline);
                 });
}

function wsServiceURLs (tool) {
    var service_URL = tool.service_URL;
    var ws_service;
    var ws_URL;

    if (!tool.ws_URL) {
        var x = service_URL.split("http:")[1].split("/?");
        ws_service = "ws:" + x[0];
        ws_URL = ws_service + "/?" + x[1];
        tool.ws_URL = ws_URL;
        tool.ws_service = ws_service;
    } else {
        ws_URL = tool.ws_URL;
        ws_service = tool.ws_service;
    };
    return {ws_URL: ws_URL, ws_service: ws_service};
}


function bamStatsURLs (task, pipeline) {
    var bamstats_tool = pipeline.getTool("bamstatsalive");
    var input_url = encodeURIComponent(task.task_ws_URL);
    var ws_urls = wsServiceURLs(bamstats_tool);
    var ws_service = ws_urls["ws_service"];
    var ws_URL = ws_urls["ws_URL"];
    return {bs_service: ws_service,
            bs_url: encodeURI(ws_URL + " -in " + input_url)};
}


function constructTaskRunMap (task, pl_graph, pipeline) {
    var tool = _.find(pipeline.tools, {id: task.tool_id});

    var service_URL = tool.service_URL;
    var ws_urls = wsServiceURLs(tool);
    var ws_service = ws_urls["ws_service"];
    var ws_URL = ws_urls["ws_URL"];

    var param_loc = tool.param_loc;
    var input_sep = tool.inputs_named ? " -in " : " ";

    var options = taskOptions(task,tool);
    var inputs = taskInputs(task, pl_graph, pipeline);
    var prefix = service_URL;
    var ws_prefix = ws_URL;
    var suffix = "";

    if (param_loc == "after-input") {
        suffix = " " + options;;
    } else {
        prefix = strJoin(" ", _.flatten([service_URL, options]));
        ws_prefix = strJoin(" ", _.flatten([ws_URL, options]));
    };

    return $.when.apply(this, inputs).then(
      function(){
        var pltask = pipeline.getTask(task.task_id);
        var urls = Array.prototype.slice.call(arguments, 0);
        pltask.runUrls = urls;
        url =  encodeURI(prefix +
                         strJoin(input_sep, [""].concat(urls)) +
                         suffix);
        wsurl = encodeURI(ws_prefix +
                          strJoin(input_sep, [""].concat(urls)) +
                          suffix);
        task.task_URL = url;
        task.task_ws_URL = wsurl;
        if (task.output_format_assignments["-out"] == "bam") {
            pltask.bamstats_urls = bamStatsURLs(task, pipeline);
        };
        pltask.runit = pltask.viz_panel ? true : false;
        //console.log("TASK", task);
        return {task_id: task.task_id,
                tool_id: task.tool_id,
                viz_panel: pltask.viz_panel,
                http_service: service_URL, http_url: url,
                ws_service: ws_service, ws_url: wsurl};
      });
}


function constructPipelineRunMaps (pipeline) {
    var pl_graph = pipeline.linearized_cfg_graph;
    var tasks = _.filter(pl_graph, function(cfg) {return ('task_id' in cfg);});
    var task_run_maps =
        _.map(tasks,
              function(task){
                  return constructTaskRunMap(task, pl_graph, pipeline);});
    return $.when.apply(this, task_run_maps).then(
      function(){
        var maps = Array.prototype.slice.call(arguments, 0);
        //console.log("Task Maps", maps);
        return _.filter(maps, function (tm) {
                                return pipeline.getTask(tm.task_id).runit;
                              });
      });
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


function wsRunPipeline (task_run_info) {
    console.log("TSKMAP:", task_run_info);
    var ws_service = task_run_info["ws_service"];
    var wsurl = task_run_info["ws_url"];
    var task_obj = app.pipeline.getTask(task_run_info["task_id"]);
    var parts = [];

    if (task_obj.bamstats_urls && task_obj.viz_panel) {
        // Trying to visualize a bam => visualize its stats
        var bsurls = task_obj.bamstats_urls;
        ws_service = bsurls["bs_service"];
        wsurl = bsurls["bs_url"];
    };

    var client = BinaryClient(ws_service);
    //console.log("WSURL:", wsurl);

    client.on('open', function() {
        var stream = client.createStream(
            {event: 'run', params: {'url': wsurl}});
        console.log("STREAM:", stream);
        stream.on('data', function(data) {
            parts.push(data);
            console.log("ON:");
            visualizeData(parts, task_run_info);
        });
        stream.on('end', function() {
            dbg_parts = parts;
            console.log("END:");
            // visualize data
            visualizeData(parts, task_run_info);
        });
    });
}


function visualizeData(parts, task_run_info) {
    var task_id = task_run_info["task_id"]
    var task_obj = app.pipeline.getTask(task_id);
    var panel = task_obj.viz_panel;

    if (panel) {
        //console.log(task_obj, panel);
        var out_fmt =
            _.find(app.pipeline.linearized_cfg_graph,
                   {task_id: task_id}).output_format_assignments["-out"];

        if (task_obj.bamstats_urls && task_obj.viz_panel) {
            // Format is actually the bamstatsalive json
            out_fmt = "json";
            task_run_info["tool_id"] = "bamstatsalive";
        };

        if (out_fmt == "json") {
            var part = 0;
            var chunk = ""
            var data = undefined;
            while (part < parts.length && !data) {
                chunk = chunk + parts[part];
                try {
                    data = JSON.parse(chunk);}
                catch (e) {
                    console.log(e);
                    part = part + 1;
                    data = undefined;
                };
            };
            if (data) {
                //console.log("DATA:", data);
                return app.viz_panels[panel].addCharts(data, task_run_info);
            } else {
                console.log("Can't read JSON for parts");
                return undefined;
            };
        } else {
            alert("Visulizing " + out_fmt + " not yet available");
        };
    };
}


function handleTaskDrop (event, uiobj) {
    var pl = app.pipeline;
    var task_div = uiobj.draggable;
    var pltask = task_div.data('task');
    var panel = $(this).data('panel');
    var title = "#title-" + strJoin("-",_.drop(panel.split("-"), 1))

    if ($(this).data('task_id')) {
        var cur_task = pl.getTask($(this).data('task_id'));
        cur_task.viz_panel = undefined;
    };

    $(title).empty().append(pltask.id);
    $(title).attr("class", "title");
    $(panel).data('task_id', pltask.id);
    pltask.viz_panel = panel;
    app.runPipeline(pl, undefined, pltask);;
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

        if (datum instanceof Task) {
            var cur_view = app.viz_panels["#current-visualization"];
            if (cur_view.cur_task) {
                cur_view.cur_task.viz_panel = undefined;
            };
            cur_view.cur_task = datum;
            datum.viz_panel = "#current-visualization";
            // Run 'current' chart update
            app.runPipeline(app.pipeline, undefined, datum);
        };
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

    app.runPipeline = function (pipeline, pl_json, run_task) {
        console.log("RunPL: " + pl_json + ", run_task: ", run_task);

        if (pl_json) {
            pl_cfg = JSON.parse(LZString.decompressFromBase64(pl_json));
            pipeline.linearized_cfg_graph =
                pipeline._constructDependencyGraph(
                    pl_cfg.inputs, pl_cfg.tasks);
        }; // else, this call from edit_pipeline and already set

        $.when(constructPipelineRunMaps(pipeline)).done(
          function (task_maps) {
            pipeline.task_maps = task_maps;
            if (task_maps.length > 0) {
              if (RUNPL) {
                if (run_task) {
                  console.log("EXPLICIT RUN");
                  // Focus or drag - only run the task selected
                  wsRunPipeline(_.find(task_maps, {task_id: run_task.id}));
                } else {
                  console.log("SEQUENCE RUN")
                  _.each(task_maps, function(tm){wsRunPipeline(tm);});
                };
              };
            };
          });
    }


    app.tool_library = new ToolLibrary(_.cloneDeep(server_data.tool_configs));

    app.global_view = new GlobalView({el: $("#global")});
    app.focal_view = new FocalView({el: $("#focal")});

    // Create our three panel visualization views
    // The first (current) always holds whatever is in 'focus'
    //
    app.viz_panels = {};
    app.viz_panels["#current-visualization"] =
        new VisualizationView({el: $("#current-visualization")});
    app.viz_panels["#mon-panel-2"] =
        new VisualizationView({el: $("#mon-panel-2")});
    app.viz_panels["#mon-panel-3"] =
        new VisualizationView({el: $("#mon-panel-3")});
    _.each(app.viz_panels, function(v) {$(v.el).data('view', v);});


    // The other two panels are 'droppables'.  User can drag a _task_
    // node from the global view and drop on one of these and its
    // results will be visualized.
    //
    $("#mon-panel-2").data('panel', '#mon-panel-2').droppable({
        drop: handleTaskDrop
    });
    $("#mon-panel-3").data('panel', '#mon-panel-3').droppable({
        drop: handleTaskDrop
    });

    Backbone.history.start({pushState: true});
});
