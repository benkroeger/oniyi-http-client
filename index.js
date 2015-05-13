'use strict';
var request = require('request'),
  _ = require('lodash'),
  tough = require('tough-cookie');

var initParams = require('./lib/helpers').initParams,
  parseUri = require('./lib/helpers').parseUri,
  makeRequestCallback = require('./lib/helpers').makeRequestCallback,
  applyPlugins = require('./lib/helpers').applyPlugins;

function OniyiHttpClient(options) {
  var self = this;
  options = _.merge({
    requestOptions: {}
  }, options || {});

  self.plugins = [];
  self.requestOptions = options.requestOptions;
}

OniyiHttpClient.prototype.registerPlugin = function(plugin) {
  var self = this;
  
  // make sure we have an array to push plugins to
  if (!Array.isArray(self.plugins)) {
    self.plugins = [];
  }

  // if only a string is provided, load built-in plugin from our own plugins folder
  if (typeof plugin === 'string') {
  	self.plugins.push(require('./plugins/' + plugin));
  	return self;
  }

  // otherwise assume, plugin is a valid plugin
  self.plugins.push(plugin);
  return self;
};

OniyiHttpClient.prototype.jar = function(store) {
  var self = this;

  // when there is no store or a sync store provided, use default method from request module
  if (!store || store.synchronous) {
    return self._request.jar(store);
  }

  // for async stores, return a new tough-cookie jar
  return new tough.CookieJar(store);
};

OniyiHttpClient.prototype.makeRequest = function(uri, options, callback) {
  var self = this;

  // initialize provided arguments into params object
  var originalParams = _.merge({}, self.requestOptions, initParams(uri, options, callback));

  originalParams = parseUri(originalParams);
  // let plugins manipulate the params object
  applyPlugins(self.plugins, originalParams, function(err, params) {
  	if (err) {
  		// something went wrong in one of the plugins
  		return originalParams.callback(err);
  	}

  	// make a clone of the params after all plugins are done manipulating
  	// and remove pluginData from the clone
  	var requestParams = _.omit(params, ['pluginData']);
    requestParams.callback = makeRequestCallback(self.plugins, params.pluginData, originalParams.callback);

  	// call our own request object with the params we have by now
  	// provide callback that will initiate the callback function of each plugin in reverse order
    return new request.Request(requestParams);
  });
};

module.exports = OniyiHttpClient;
