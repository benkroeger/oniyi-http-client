'use strict';

var url = require('url'),
  util = require('util');

var async = require('async'),
  request = require('request');

function isFunction(value) {
  return typeof value === 'function';
}

function parseUri(params) {
  // People use this property instead all the time, so support it
  if (!params.uri && params.url) {
    params.uri = params.url;
    delete params.url;
  }

  // If there's a baseUrl, then use it as the base URL (i.e. uri must be
  // specified as a relative path and is appended to baseUrl).
  if (params.baseUrl) {
    if (typeof params.baseUrl !== 'string') {
      throw new Error('options.baseUrl must be a string');
    }

    if (typeof params.uri !== 'string') {
      throw new Error('options.uri must be a string when using options.baseUrl');
    }

    if (params.uri.indexOf('//') === 0 || params.uri.indexOf('://') !== -1) {
      throw new Error('options.uri must be a path when using options.baseUrl');
    }

    // Handle all cases to make sure that there's only one slash between
    // baseUrl and uri.
    var baseUrlEndsWithSlash = (params.baseUrl.lastIndexOf('/') === params.baseUrl.length - 1);
    var uriStartsWithSlash = (params.uri.indexOf('/') === 0);

    if (baseUrlEndsWithSlash && uriStartsWithSlash) {
      params.uri = params.baseUrl + params.uri.slice(1);
    } else if (baseUrlEndsWithSlash || uriStartsWithSlash) {
      params.uri = params.baseUrl + params.uri;
    } else if (params.uri === '') {
      params.uri = params.baseUrl;
    } else {
      params.uri = params.baseUrl + '/' + params.uri;
    }
    delete params.baseUrl;
  }

  // A URI is needed by this point, throw if we haven't been able to get one
  if (!params.uri) {
    throw new Error('options.uri is a required argument');
  }

  // If a string URI/URL was given, parse it into a URL object
  if (typeof params.uri === 'string') {
    params.uri = url.parse(params.uri);
  }

  return params;
}

function initParams() {
  var params = request.initParams.apply(null, arguments);
  params.method = params.method || 'GET';
  
  return params;
}

function applyPlugins(plugins, params, callback){
  params.pluginData = {};
  async.reduce(plugins, params, function(currentParams, plugin, cb){
    if (typeof plugin.name !== 'string') {
      return cb(new TypeError('plugin.name must be a string'));
    }

    if (!isFunction(plugin.onRequest)) {
      return cb(null, currentParams);
    }

    // create an object for this plugin's data
    params.pluginData[plugin.name] = {};

    var minArgs = (plugin.storesData) ? 2 : 1;

    // check if onRequest is a synchronus function
    if(plugin.onRequest.length === minArgs) {
      try {
        var newParams = plugin.onRequest(currentParams, params.pluginData[plugin.name]);
        return cb(null, newParams);
      } catch(ex) {
        return cb(ex);
      }
    }

    // check if onRequest takes more than the minumum number of arguments
    // which would mean, it takes a callback --> is async
    if(plugin.onRequest.length > minArgs) {
      if (plugin.storesData) {
        return plugin.onRequest(currentParams, params.pluginData[plugin.name], cb);
      }
      return plugin.onRequest(currentParams, cb);
    }

    return cb(new Error(util.format('unkonwn signature for "onRequest" on plugin "%s"', plugin.name)));

  }, callback);
}

function makeRequestCallback(plugins, pluginData, originalCallback) {
  
  var remainingPlugins = plugins.filter(function(plugin){
    return isFunction(plugin.callback);
  }).map(function(plugin){
    return plugin;
  });

  function next() {
    // if there is no plugin left in our chain, invoke the original callback
    if (remainingPlugins.length === 0) {
      return originalCallback.apply(null, arguments);
    }

    var args = Array.prototype.slice.call(arguments);
    var plugin = remainingPlugins.pop();

    // if needed by plugin, prepend args with data storage
    if (plugin.storesData) {
      args.unshift(pluginData[plugin.name]);
    }

    // make the "next" callback the first argument 
    args.unshift(next);
    plugin.callback.apply(null, args);
  }

  return next;
}

exports.initParams = initParams;
exports.parseUri = parseUri;
exports.applyPlugins = applyPlugins;
exports.makeRequestCallback = makeRequestCallback;
