'use strict';

// core modules
const util = require('util');
const path = require('path');

// npm modules
const _ = require('lodash');
const request = require('request');
const tough = require('tough-cookie');
const pkg = require(path.resolve(__dirname, '..', 'package.json'));
const logger = require('oniyi-logger')(util.format('%s@v%s', pkg.name, pkg.version));

// others
const Request = require('./request');

function OniyiHttpClient(params) {
  const options = _.assign({}, params || {});

  const client = {};
  const defaults = options.defaults || {};
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

      plugin = require(pluginPath);
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

    // call request directly, if there are no plugins loaded in this client
    if (!Array.isArray(plugins) || plugins.length < 1) {
      logger.info('no plugins loaded, uri: %s', initialParams.uri);
      return new request.Request(_.merge({}, defaults, initialParams));
    }

    // merge params with defaults
    const requestParams = _.merge({
      method: 'GET',
    }, defaults, initialParams);

    return new Request(requestParams, plugins);
  }

  function getDefaults() {
    return _.cloneDeep(defaults);
  }

  // Sugar methods
  const sugarMethods = ['get', 'put', 'post', 'del', 'head', 'options'].reduce((sugar, method) => {
    const requestMethod = method === 'del' ? 'DELETE' : method.toUpperCase();
    /* eslint-disable no-param-reassign */
    sugar[method] = (uri, reqOptions, reqCallback) => {
      // initialize provided arguments into params object
      // set request method
      const requestParams = _.assign(request.initParams(uri, reqOptions, reqCallback), {
        method: requestMethod,
      });

      // make actual request
      return makeRequest(requestParams, requestParams.callback);
    };
    /* eslint-enable no-param-reassign */

    return sugar;
  }, {});

  // init any plugins provided on client creation
  if (Array.isArray(options.plugins) && options.plugins.lenth > 0) {
    options.plugins.forEach((pluginSpec) => {
      mountPlugin(pluginSpec);
    });
  }

  _.assign(client, {
    use: mountPlugin,
    jar,
    makeRequest,
    getDefaults,
  }, sugarMethods);

  // finally return the client instance
  return client;
}

module.exports = OniyiHttpClient;
