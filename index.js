'use strict';
var request = require('request'),
  _ = require('lodash'),
  tough = require('tough-cookie');


// local variable definitions
var initParams = require('./lib/helpers').initParams,
  parseUri = require('./lib/helpers').parseUri,
  makeRequestCallback = require('./lib/helpers').makeRequestCallback,
  applyPlugins = require('./lib/helpers').applyPlugins;

var requestValidParameters = [
  'uri',
  'baseUrl',
  'method',
  'headers',
  'auth',
  'qs',
  'qsParseOptions',
  'qsStringifyOptions',
  'useQuerystring',
  'body',
  'form',
  'formData',
  'multipart',
  'preambleCRLF',
  'postambleCRLF',
  'json',
  'jsonReviver',
  'auth',
  'oauth',
  'hawk',
  'aws',
  'httpSignature',
  'followRedirect',
  'followAllRedirects',
  'maxRedirects',
  'encoding',
  'gzip',
  'jar',
  'pool',
  'timeout',
  'localAddress',
  'proxy',
  'strictSSL',
  'agentOptions',
  'tunnel',
  'proxyHeaderWhiteList',
  'proxyHeaderExclusiveList',
  'time',
  'har'
];

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

OniyiHttpClient.prototype.extractRequestParams = function(params, omit) {
  if (!params) {
    return {};
  }
  var requestParams = _.pick(params, requestValidParameters);
  if (Array.isArray(omit)) {
    return _.omit(requestParams, omit);
  }
  return requestParams;
};

OniyiHttpClient.prototype.makeRequest = function() {
  var self = this;

  // initialize provided arguments into params object
  var originalParams = _.merge({}, self.requestOptions, initParams.apply(null, arguments));

  originalParams = parseUri(originalParams);
  // let plugins manipulate the params object
  applyPlugins(self.plugins, originalParams, function(err, params, response, body) {
    if (err) {
      // something went wrong in one of the plugins
      return originalParams.callback(err);
    }

    if (response && body !== undefined) {
      var currentPluginIndex = self.plugins.map(function(plugin){
        return plugin.name;
      }).indexOf(params.currentPlugin) - 1;

      var plugins = [];
      if (currentPluginIndex > self.plugins.length) {
        plugins = self.plugins.slice(0, currentPluginIndex);
      }

      var callback = makeRequestCallback(plugins, params.pluginData, originalParams.callback);

      return callback(null, response, body);
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
