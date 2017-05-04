'use strict';

// node core modules
const path = require('path');

// 3rd party modules
const request = require('request');
const tough = require('tough-cookie');
const _ = require('lodash');
const logger = require('oniyi-logger')('oniyi:http-client');

// internal modules
const Request = require('./request');
const { parseUri } = require('./helpers');

function OniyiHttpClient(params = {}) {
  const client = {};
  const { defaults = {} } = params;
  const plugins = [];

  function mountPlugin(pluginSpec) {
    // when called without arguments, return immediately
    if (!pluginSpec) {
      logger.warn('use: invalid pluginSpec argument provided', pluginSpec);
      return client;
    }

    let plugin = pluginSpec;
    // if plugin argument is a string, load built-in plugin
    if (typeof pluginSpec === 'string') {
      const pluginPath = path.resolve(__dirname, '..', 'plugins', pluginSpec.toLowerCase());

      logger.debug('use: plugin argument is of type "string');
      logger.debug('use: resolved plugin path "%s"', pluginPath);

      plugin = require(pluginPath); // eslint-disable-line global-require
    }

    // check plugin type
    // should have name property
    // should have onRequest or callback properties of type function
    if (!_.isPlainObject(plugin)) {
      logger.warn('use: failed to resolve plugin argument to plain object', plugin);
      return client;
    }

    plugins.push(plugin);
    logger.debug('use: added plugin "%s" on position "%d"', plugin.name, plugins.length);
    return client;
  }

  function jar(store) {
    // when there is no store or a sync store provided, use default method from request module
    if (!store || store.synchronous) {
      return request.jar(store);
    }

    // for async stores, return a new tough-cookie jar
    return new tough.CookieJar(store);
  }

  function makeRequest(uri, reqOptions, reqCallback) {
    // initialize provided arguments into params object
    const initialParams = request.initParams(uri, reqOptions, reqCallback);

    // merge params with defaults
    let requestParams = _.defaultsDeep({},
      initialParams,
      defaults, {
        method: 'GET',
      });

    // augment requestParams to properly handle absolute uris
    requestParams = parseUri(requestParams);

    // call request directly, if there are no plugins loaded in this client
    if (!Array.isArray(plugins) || plugins.length < 1) {
      logger.debug('no plugins loaded, uri: %s', initialParams.uri);
      return new request.Request(requestParams);
    }

    return new Request(requestParams, plugins);
  }

  function getDefaults() {
    return _.cloneDeep(defaults);
  }

  // Sugar methods
  const sugarMethods = ['get', 'put', 'post', 'del', 'head', 'options'].reduce((sugar, method) => {
    const requestMethod = method === 'del' ? 'DELETE' : method.toUpperCase();
    Object.assign(sugar, {
      [method]: (uri, reqOptions, reqCallback) => {
        // initialize provided arguments into params object
        // set request method
        const requestParams = Object.assign(request.initParams(uri, reqOptions, reqCallback), {
          method: requestMethod,
        });

        // make actual request
        return makeRequest(requestParams, requestParams.callback);
      },
    });

    return sugar;
  }, {});

  // init any plugins provided on client creation
  if (Array.isArray(params.plugins) && params.plugins.lenth > 0) {
    params.plugins.forEach((plugin) => {
      mountPlugin(plugin);
    });
  }

  Object.assign(client, {
    use: mountPlugin,
    jar,
    makeRequest,
    getDefaults,
  }, sugarMethods);

  // finally return the client instance
  return client;
}

module.exports = OniyiHttpClient;
