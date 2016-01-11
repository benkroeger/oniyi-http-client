'use strict';

var util = require('util');

var async = require('async');
var _ = require('lodash');

function applyPlugins(req, plugins, params, callback) {
  if (!Array.isArray(plugins)) {
    return req.emit('error', new TypeError('plugins must be an array'));
  }

  // ensure async nature of plugin.load function
  plugins = plugins.map(function (plugin) {
    if (plugin.load && plugin.load.length === 2) {
      plugin.load = async.asyncify(plugin.load);
    }
    return plugin;
  });

  async.reduce(plugins, _.cloneDeep(params), function (currentParams, plugin, iteratorCallback) {
    var err;

    // keep track of the currently executed plugin
    params.currentPlugin = plugin.name;

    // verify that we have a name property
    if (typeof plugin.name !== 'string') {
      err = new TypeError('plugin.name must be a string');
      return iteratorCallback(err);
    }

    // verify the load property exists and is of type function
    if (!_.isFunction(plugin.load)) {
      err = new TypeError(util.format('Plugin "%s": property "load" must be of type function', plugin.name));
      return iteratorCallback(err);
    }

    // call the plugin's load function
    return plugin.load(req, currentParams, iteratorCallback);

  }, function (err, newParams) {
    if (err) {
      return req.emit('error', err);
    }
    return callback(null, newParams);
  });
}

module.exports = applyPlugins;
