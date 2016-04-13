'use strict';

const util = require('util');

const async = require('async');
const _ = require('lodash');

function applyPlugins(req, plugins, params, callback) {
  if (!Array.isArray(plugins)) {
    return req.emit('error', new TypeError('plugins must be an array'));
  }

  // ensure async nature of plugin.load function
  const asyncPlugins = plugins.map((plugin) => {
    if (plugin.load && plugin.load.length === 2) {
      return _.assign(plugin, {
        load: async.asyncify(plugin.load),
      });
    }
    return plugin;
  });

  return async.reduce(asyncPlugins, _.cloneDeep(params), (currentParams, plugin, iteratorCallback) => {
    let reduceError;

    // verify that we have a name property
    if (typeof plugin.name !== 'string') {
      reduceError = new TypeError('plugin.name must be a string');
      return iteratorCallback(reduceError);
    }

    // verify the load property exists and is of type function
    if (!_.isFunction(plugin.load)) {
      reduceError = new TypeError(util.format('Plugin "%s": property "load" must be of type function', plugin.name));
      return iteratorCallback(reduceError);
    }

    // call the plugin's load function
    return plugin.load(req, currentParams, iteratorCallback);
  }, (err, newParams) => {
    if (err) {
      return req.emit('error', err);
    }
    return callback(null, newParams);
  });
}

module.exports = applyPlugins;
