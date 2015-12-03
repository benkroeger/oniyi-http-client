'use strict';

// core modules
var util = require('util');
var path = require('path');
// var DuplexStream = require('stream').Duplex;

// npm modules
var _ = require('lodash');
var request = require('request');
var tough = require('tough-cookie');
var pkg = require(path.resolve(__dirname, '..', 'package.json'));
var logger = require('oniyi-logger')(util.format('%s@v%s', pkg.name, pkg.version));

// others
var applyPlugins = require('./helpers/apply-plugins');
var parseUri = require('./helpers/parse-uri');

function OniyiHttpClient(options) {
  if (!(this instanceof OniyiHttpClient)) {
    return new OniyiHttpClient(options);
  }

  // become a stream
  // DuplexStream.call(this, {});

  options = options || {};
  this.defaults = options.defaults || {};
  this.plugins = [];
}

// util.inherits(OniyiHttpClient, DuplexStream);
// _read(size) and _write(chunk, encoding, callback)

OniyiHttpClient.prototype.registerPlugin = function (plugin) {
  var self = this;

  // when called without arguments, return immediately
  if (!plugin) {
    return self;
  }

  // make sure we have an array to push plugins to
  if (!Array.isArray(self.plugins)) {
    self.plugins = [];
  }

  // if plugin argument is a string, load built-in plugin
  if (typeof plugin === 'string') {
    plugin = path.resolve(__dirname, '..', 'plugins', plugin.toLowerCase());
    plugin = require(plugin);
  }

  // check plugin type
  // should have name property
  // should have onRequest or callback properties of type function
  if (!_.isPlainObject(plugin)) {
    return self;
  }

  self.plugins.push(plugin);
  return self;
};

OniyiHttpClient.prototype.jar = function (store) {
  // when there is no store or a sync store provided, use default method from request module
  if (!store || store.synchronous) {
    return request.jar(store);
  }

  // for async stores, return a new tough-cookie jar
  return new tough.CookieJar(store);
};

OniyiHttpClient.prototype.makeRequest = function () {
  var self = this;

  var initialParams = request.initParams.apply(null, arguments);
  var callback = initialParams.callback;

  // initialize provided arguments into params object
  parseUri(self.defaults, initialParams, function (uriError, params) {
    if (uriError) {
      logger.error(uriError);
      return callback(uriError);
    }
    // let plugins manipulate the params object
    applyPlugins(self.plugins, params, function (pluginError, modifiedParams) {
      if (pluginError) {
        // something went wrong in one of the plugins
        logger.error(pluginError);
        return callback(pluginError);
      }

      // initiate new Request with parsed and modified parameters
      return new request.Request(modifiedParams);
    });
  });
};

module.exports = OniyiHttpClient;
