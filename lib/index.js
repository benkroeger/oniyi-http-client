'use strict';

// node core modules
const path = require('path');

// 3rd party modules
const request = require('request');
const tough = require('tough-cookie');
const _ = require('lodash');
const logger = require('oniyi-logger')('oniyi:http-client');

// internal modules
const { parseUri, incrementLoadedPlugins, displayPluginsLoadingData } = require('./helpers');
const { initRequestPhaseList } = require('./phases');

function OniyiHttpClient(params = {}) {
  const client = {};

  // since there might be multiple phaseLists, we should pick proper naming for this options
  const { defaults = {}, phaseLists: { requestPhaseNames = []/* , responsePhaseNames */ } = {} } = params;
  const requestPhaseList = initRequestPhaseList(requestPhaseNames);

  function mountPlugin(pluginSpec, phaseName = 'initial') {
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

      plugin = require(pluginPath); // eslint-disable-line global-require,import/no-dynamic-require
    }

    // check plugin type
    // should have name property
    // should have onRequest or callback properties of type function
    if (!_.isPlainObject(plugin)) {
      logger.warn('use: failed to resolve plugin argument to plain object', plugin);
      return client;
    }

    const phaseHandler = ({ requestOptions, hookState }, next) => {
      const { name, load } = plugin;

      // verify that we have a name property
      if (!_.isString(name)) {
        const handleError = new TypeError('plugin.name must be a string');
        next(handleError);
        return;
      }
      // const { skip } = requestOptions;
      // if (skip && skip.includes(plugin.name)) {
      //   next();
      //   return;
      // }

      // verify the load property exists and is of type function
      if (!_.isFunction(load)) {
        const handleError = new TypeError(`Plugin [${name}]: property "load" must be of type function`);
        next(handleError);
        return;
      }
      // update hook state for every loaded plugin
      incrementLoadedPlugins(hookState);

      // call the plugin's load function
      plugin.load(null, requestOptions, next);
    };

    requestPhaseList.registerHandler(phaseName, phaseHandler);
    logger.debug(`use: phase handler for [${phaseName}] registered`);

    return client;
  }

  const jar = store =>
    // when there is no store or a sync store provided, use default method from request module
    // for async stores, return a new tough-cookie jar
    (!store || store.synchronous
      ? request.jar(store)
      : new tough.CookieJar(store));

  function makeRequest(uri, reqOptions, reqCallback) {
    // initialize provided arguments into params object
    const initialParams = request.initParams(uri, reqOptions, reqCallback);
    // init hook state
    const hookState = {
      pluginsLoaded: 0,
    };

    // merge params with defaults
    let requestOptions = _.defaultsDeep(
      {},
      initialParams,
      {
        method: 'GET',
      },
      defaults
    );

    // augment requestParams to properly handle absolute uris
    requestOptions = parseUri(requestOptions);

    const ctx = { requestOptions, hookState };
    // save reference to the original callback
    const { callback } = requestOptions;
    // https://github.com/kriskowal/q#using-deferreds

    return new Promise((resolve, reject) =>
      requestPhaseList.run(ctx, (phaseError) => {
        if (phaseError) {
          return _.isFunction(callback)
            ? callback(phaseError)
            : reject(phaseError);
        }
        displayPluginsLoadingData(hookState);

        if (_.isFunction(callback)) {
          // override the current callback in order to add new phase list
          // responsible for handling/manipulating a response object
          requestOptions.callback = (err, response, body) => {
            // TODO: add a response phaseList

            callback(err, response, body);
          };
        }

        return resolve(new request.Request(requestOptions)); // eslint-disable-line no-new
      }));
  }

  const getDefaults = () => _.cloneDeep(defaults);

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
  if (Array.isArray(params.plugins) && params.plugins.length > 0) {
    params.plugins.forEach((plugin) => {
      mountPlugin(plugin);
    });
  }

  Object.assign(
    client,
    {
      use: mountPlugin,
      jar,
      makeRequest,
      getDefaults,
    },
    sugarMethods
  );

  // finally return the client instance
  return client;
}

module.exports = OniyiHttpClient;
