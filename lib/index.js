'use strict';

// core modules
var util = require('util');
var path = require('path');

// npm modules
var _ = require('lodash');
var request = require('request');
var tough = require('tough-cookie');
var pkg = require(path.resolve(__dirname, '..', 'package.json'));
var logger = require('oniyi-logger')(util.format('%s@v%s', pkg.name, pkg.version));

// others
var Request = require('./request');

function OniyiHttpClient(options) {
  if (!(this instanceof OniyiHttpClient)) {
    return new OniyiHttpClient(options);
  }

  options = options || {};
  this.defaults = options.defaults || {};
  this.plugins = [];

  this.requestFunction = request.defaults(this.defaults);
}

OniyiHttpClient.prototype.use = function usePlugin(plugin) {
  var self = this;

  // when called without arguments, return immediately
  if (!plugin) {
    logger.warn('usePlugin: invalid plugin argument provided', plugin);
    return self;
  }

  // make sure we have an array to push plugins to
  if (!Array.isArray(self.plugins)) {
    self.plugins = [];
  }

  // if plugin argument is a string, load built-in plugin
  if (typeof plugin === 'string') {
    plugin = path.resolve(__dirname, '..', 'plugins', plugin.toLowerCase());

    logger.debug('usePlugin: plugin argument is of type "string');
    logger.debug('usePlugin: resolved plugin path "%s"', plugin);

    plugin = require(plugin);
  }

  // check plugin type
  // should have name property
  // should have onRequest or callback properties of type function
  if (!_.isPlainObject(plugin)) {
    logger.warn('usePlugin: failed to resolve plugin argument to plain object', plugin);
    return self;
  }

  self.plugins.push(plugin);
  logger.debug('usePlugin: added plugin "%s" on position "%d"', plugin.name, self.plugins.length);
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

  // initialize provided arguments into params object
  var initialParams = request.initParams.apply(null, arguments);

  // call request directly, if there are no plugins loaded in this client
  if (!Array.isArray(self.plugins) || self.plugins.length < 1) {
    logger.info('no plugins loaded, uri:', initialParams.uri.href);
    return new self.requestFunction.Request(initialParams);
  }

  // merge params with defaults
  var params = _.merge({
    method: 'GET'
  }, self.defaults, initialParams);

  return new Request(params, self.plugins);
};

// Sugar methods
['get', 'put', 'post', 'del', 'head', 'options'].forEach(function makeSugarMethod(method) {
  var requestMethod = method === 'del' ? 'DELETE' : method.toUpperCase();

  OniyiHttpClient.prototype[method] = function () {
    // initialize provided arguments into params object
    var params = request.initParams.apply(null, arguments);

    // set request method
    params.method = requestMethod;

    // make actual request
    return this.makeRequest(params, params.callback);
  };
});

module.exports = OniyiHttpClient;
