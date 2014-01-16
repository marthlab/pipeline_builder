/**
* This is a self-contained module that defines its routes, callbacks, models and views
* all internally. Such approach to code organization follows the recommendations of TJ:
*
* http://vimeo.com/56166857
* 
*/

// Third-party libraries
var _ = require('underscore')
  , CONF = require('config')
  , express = require('express')
  , app = exports = module.exports = express();

// Don't just use, but also export in case another module needs to use these as well.
exports.callbacks    = require('./controllers/pipeline_builder_server');

// Module's Routes
app.get('*', exports.callbacks.servePage);
