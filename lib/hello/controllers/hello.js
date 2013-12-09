var _ = require('lodash');
var fs = require('fs');
var async = require('async');
var util = require('util');

exports = module.exports;

var greeter   = require('../models/greeter');

exports.sayHello = function(req, res) {

  var name = req.param('name', '');

  var builder_data = { };
  var data_dir = __dirname + '/../data';
  var tools_dir = data_dir+'/tools';
  var pipelines_dir = data_dir+'/pipelines';

  async.series([
    // get tools
    function(callback) {
      fs.readdir(tools_dir, function(err, tool_filenames) {
        async.map(tool_filenames, function(filename, callback) {
          fs.readFile(tools_dir + '/' + filename, function(err, file_content) {
            var package = JSON.parse(file_content.toString("utf8"));
            package = _.each(package, function(tool){ tool.package = filename.slice(0, -5);});
            callback(null, package);
          });
        }, function(err, tools_data){
          builder_data.tool_configs = _.union.apply(null, tools_data);
          callback();
        });
      })
    },
    // get pipelines
    function(callback) {
      fs.readdir(pipelines_dir, function(err, pipeline_filenames) {
        async.map(pipeline_filenames, function(filename, callback) {
          fs.readFile(pipelines_dir + '/' + filename, function(err, file_content) {
            var pipeline = JSON.parse(file_content.toString("utf8"));
            // replace tool names with definitions

            pipeline.tools = pipeline.tools.map(function(tool_id) {
              return _.find(builder_data.tool_configs, function(tool_cfg){
                return tool_cfg.id === tool_id;
              });
            }).filter(function(tool){ return !!tool; });

            callback(null, pipeline);
          });
        }, function(err, pipelines_data){
          builder_data.pipeline_configs = pipelines_data;
          callback();
        });
      })
    },
    // send processed builder data
    function() {
      //console.log(util.inspect(builder_data, false, null));
      var context = {
        site_title: "Pipeline Builder",
        welcome_message: greeter.welcomeMessage(name),
        builder_json: JSON.stringify(builder_data)
      }

      var template = '../lib/hello/views/hello';
      res.render(template, context);

      // More elaborate res.render() format:
      //res.render(template, context, function(err, html) {
      //  console.dir(err);
      //  res.send(html);
      //});

      // Just responding with a string, without any template:
      //res.send('Hello World');
    }
  ]);

};