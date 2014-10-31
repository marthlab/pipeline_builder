
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

function inputURL(input, pl_graph, pipeline) {
    if ('pipeline_input_id' in input) {
        var pi_obj = {pipeline_input_id: input.pipeline_input_id};
        return _.find(pl_graph, pi_obj).data_URL;
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
    if (task.input_src_assignments["--bam"] != undefined) 
      if (inputs == undefined)
        inputs = task.input_src_assignments["--bam"] ;
      else
        inputs.concat( task.input_src_assignments["--bam"] );
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
        var x = service_URL.split("http://")[1].split("/?");
        ws_service = "ws://" + x[0];
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

    url =  encodeURI(prefix +
                     strJoin(input_sep, [""].concat(inputs)) +
                     suffix);
    wsurl = encodeURI(ws_prefix +
                      strJoin(input_sep, [""].concat(inputs)) +
                      suffix);

    task.task_URL = url;
    task.task_ws_URL = wsurl;

    if (task.output_format_assignments["-out"] == "bam") {
        if (pipeline.getTool('bamstatsalive') == undefined)
          pipeline.addTool( app.tool_library.getTool('bamstatsalive') );
        pipeline.getTask(task.task_id).bamstats_urls =
            bamStatsURLs(task, pipeline);
    }

    return {task_id: task.task_id,
            tool_id: task.tool_id,
            viz_panel: task.viz_panel,
            http_service: service_URL, http_url: url,
            ws_service: ws_service, ws_url: wsurl};
}


function constructPipelineRunMaps (pipeline) {
    var pl_graph = pipeline.linearized_cfg_graph;
    var tasks = _.filter(pl_graph, function(cfg) {return ('task_id' in cfg);});
    var task_run_maps =
        _.map(tasks,
              function(task){
                  return constructTaskRunMap(task, pl_graph, pipeline);});
    return _.filter(task_run_maps,
                    function (tm) {
                        return pipeline.getTask(tm.task_id).runit;
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

    client.on('open', function() {
        var stream = client.createStream(
            {event: 'run', params: {'url': wsurl}});
        var buffer = ""
        stream.on('data', function(data) {
              if (data == undefined) return;               
              if (task_obj.id == 'freebayes') {
                visualizeData(data, task_run_info);
                return;
              }               
               try {
                var str = buffer + data;
                 var obj = json_parse_raw(str)
                 var json = obj[0];
                 buffer = str.slice(obj[1], str.length);
                 var success = true;
               } catch(e) {
                 success = false;
                 buffer += data;
               } if(success) {                 
                 visualizeData(json, task_run_info);
               }
        });
        stream.on('end', function() {
            //dbg_parts = parts;
            //console.log(parts);
            //$("#mon-panel-2").append(strJoin("\n", parts));
            // visualize data
            //visualizeData(parts, task_run_info);
        });
    });
}

var json_parse_raw = (function() {
  "use strict";

  // This is a function that can parse a JSON text, producing a JavaScript
  // data structure. It is a simple, recursive descent parser. It does not use
  // eval or regular expressions, so it can be used as a model for implementing
  // a JSON parser in other languages.

  // We are defining the function inside of another function to avoid creating
  // global variables.
  var at, // The index of the current character
  ch, // The current character
  escapee = {
    '"': '"',
    '\\': '\\',
    '/': '/',
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t'
  },
    text,

    error = function(m) {

      // Call error when something is wrong.
      throw {
        name: 'SyntaxError',
        message: m,
        at: at,
        text: text
      };
    },

    incomplete = function(m) {
      throw {
        name: 'IncompleteJson',
        message: m,
        at: at,
        text: text
      };
    },

    next = function(c) {

      // If a c parameter is provided, verify that it matches the current character.
      if (c && c !== ch) {
        m = ("Expected '" + c + "' instead of '" + ch + "'");
        if (!ch) incomplete(m);
        else error(m);
      }

      // Get the next character. When there are no more characters,
      // return the empty string.
      ch = text.charAt(at);
      at += 1;
      return ch;
    },

    number = function() {

      // Parse a number value.
      var number, string = '';

      if (ch === '-') {
        string = '-';
        next('-');
      }
      while (ch >= '0' && ch <= '9') {
        string += ch;
        next();
      }
      if (ch === '.') {
        string += '.';
        while (next() && ch >= '0' && ch <= '9') {
          string += ch;
        }
      }
      if (ch === 'e' || ch === 'E') {
        string += ch;
        next();
        if (ch === '-' || ch === '+') {
          string += ch;
          next();
        }
        while (ch >= '0' && ch <= '9') {
          string += ch;
          next();
        }
      }
      number = +string;
      if (!isFinite(number)) {
        error("Bad number");
      } else {
        return number;
      }
    },

    string = function() {

      // Parse a string value.
      var hex, i, string = '',
        uffff;

      // When parsing for string values, we must look for " and \ characters.
      if (ch === '"') {
        while (next()) {
          if (ch === '"') {
            next();
            return string;
          } else if (ch === '\\') {
            next();
            if (ch === 'u') {
              uffff = 0;
              for (i = 0; i < 4; i += 1) {
                hex = parseInt(next(), 16);
                if (!isFinite(hex)) {
                  break;
                }
                uffff = uffff * 16 + hex;
              }
              string += String.fromCharCode(uffff);
            } else if (typeof escapee[ch] === 'string') {
              string += escapee[ch];
            } else {
              break;
            }
          } else {
            string += ch;
          }
        }
      }
      if (ch === '') incomplete("Bad string");
      else error("Bad string");
    },

    white = function() {

      // Skip whitespace.
      while (ch && ch <= ' ') {
        next();
      }
    },

    word = function() {

      // true, false, or null.
      switch (ch) {
      case 't':
        next('t');
        next('r');
        next('u');
        next('e');
        return true;
      case 'f':
        next('f');
        next('a');
        next('l');
        next('s');
        next('e');
        return false;
      case 'n':
        next('n');
        next('u');
        next('l');
        next('l');
        return null;
      }
      error("Unexpected '" + ch + "'");
    },

    value, // Place holder for the value function.
    array = function() {

      // Parse an array value.
      var array = [];

      if (ch === '[') {
        next('[');
        white();
        if (ch === ']') {
          next(']');
          return array; // empty array
        }
        while (ch) {
          array.push(value());
          white();
          if (ch === ']') {
            next(']');
            return array;
          }
          next(',');
          white();
        }
      }
      if (ch === '') incomplete("Bad array");
      else error("Bad array");
    },

    object = function() {

      // Parse an object value.
      var key, object = {};

      if (ch === '{') {
        next('{');
        white();
        if (ch === '}') {
          next('}');
          return object; // empty object
        }
        while (ch) {
          key = string();
          white();
          next(':');
          if (Object.hasOwnProperty.call(object, key)) {
            error('Duplicate key "' + key + '"');
          }
          object[key] = value();
          white();
          if (ch === '}') {
            next('}');
            return object;
          }
          next(',');
          white();
        }
      }
      if (ch === '') incomplete("Bad object");
      else error("Bad object");
    };

  value = function() {

    // Parse a JSON value. It could be an object, an array, a string, a number,
    // or a word.
    white();
    switch (ch) {
    case '{':
      return object();
    case '[':
      return array();
    case '"':
      return string();
    case '-':
      return number();
    default:
      return ch >= '0' && ch <= '9' ? number() : word();
    }
  };

  // Return the json_parse function. It will have access to all of the above
  // functions and variables.
  var try_parse = function(source, reviver) {
      var result;

      text = source;
      at = 0;
      ch = ' ';
      result = value();
      white();
      //if (ch) {
      //    error("Syntax error");
      //}

      // If there is a reviver function, we recursively walk the new structure,
      // passing each name/value pair to the reviver function for possible
      // transformation, starting with a temporary root object that holds the result
      // in an empty key. If there is not a reviver function, we simply return the
      // result.
      return typeof reviver === 'function' ? (function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value === 'object') {
          for (k in value) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
              v = walk(value, k);
              if (v !== undefined) {
                value[k] = v;
              } else {
                delete value[k];
              }
            }
          }
        }
        return [reviver.call(holder, key, value), at - 1];
      }({
        '': result
      }, '')) : [result, at - 1];
    };

  return function(source, reviver) {
    if (source === '') return [undefined, 0];
    try {
      return try_parse(source, reviver);
    } catch (e) {
      if (e.name === "IncompleteJson") return [undefined, 0];
      else throw e;
    }
  };
}())


function visualizeData(data, task_run_info) {
    var task_id = task_run_info["task_id"];
    var tool_id = task_run_info["tool_id"];
    var task_obj = app.pipeline.getTask(task_id);
    var panel = task_obj.viz_panel;

    if (panel) {
        console.log(task_id, tool_id, task_obj, panel);
        var out_fmt =
            _.find(app.pipeline.linearized_cfg_graph,
                   {task_id: task_id}).output_format_assignments["-out"];

        if (task_obj.bamstats_urls && task_obj.viz_panel) {
            // Format is actually the bamstatsalive json
            out_fmt = "json";
            tool_id = "bamstatsalive";
        };

        if (out_fmt == "json") {
            app.viz_panels[panel].initializeCharts(data, task_id, tool_id);
        } else {
           // alert("Visulizing " + out_fmt + " not yet available");             
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
        //console.log("RunPL: " + pl_json);

        if (pl_json) {
            pl_cfg = JSON.parse(LZString.decompressFromBase64(pl_json));
            pipeline.linearized_cfg_graph =
                pipeline._constructDependencyGraph(
                    pl_cfg.inputs, pl_cfg.tasks);
        }; // else, this call from edit_pipeline and already set

        var task_maps = constructPipelineRunMaps(pipeline);
        pipeline.task_maps = task_maps;
        if (task_maps) {
            if (RUNPL) {
                if (run_task) {
                    // Focus or drag - only run the task selected
                    wsRunPipeline(_.find(task_maps, {task_id: run_task.id}));
                } else {
                    _.each(task_maps, function(tm){wsRunPipeline(tm);});
                };
            };
        };
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
