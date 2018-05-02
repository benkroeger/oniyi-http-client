'use strict';

// node core modules

// 3rd party modules
const request = require('request');
const tough = require('tough-cookie');
const _ = require('lodash');
const debug = require('debug')('oniyi:http-client');

// internal modules
const phaseList = require('./phase-list');
const makeRequest = require('./make-request');
const { mountPlugin } = require('./utils');

/**
 * @class HttpClient
 */

const httpClient = (params = {}) => {
  debug('creating new httpClient instance with %o', params);

  const { defaults = {} } = params;
  const phaseLists = ['request', 'response'].reduce(
    (result, name) => Object.assign(result, { [name]: phaseList(params[`${name}Phases`] || []) }),
    {}
  );

  const instance = {};

  /**
   * @method defaults
   * @memberof! HttpClient#
   * @returns {Object} a clone of this instance's defaults object
   */
  Object.defineProperty(instance, 'defaults', {
    get() {
      return _.cloneDeep(defaults);
    },
    enumerable: true,
    configurable: false,
  });

  /**
   * Create a new {@link https://github.com/salesforce/tough-cookie#cookiejar|CookieJar} with the provided
   * {@link https://github.com/salesforce/tough-cookie#store|Store} implementation.
   * Will use `request.jar(store)` {@link https://github.com/request/request#requestjar|method}
   * for creation when `store` is not async, `tough.CookieJar(store)` instead.
   * @method jar
   * @memberof! HttpClient#
   * @param   {Object} [store]  {@link https://github.com/salesforce/tough-cookie#store|tough-cookie Store}
   * @returns {Object}          {@link https://github.com/salesforce/tough-cookie#cookiejar|CookieJar}
   */
  Object.defineProperty(instance, 'jar', {
    value: store =>
      // when there is no store or a sync store provided, use default method from request module
      // for async stores, return a new tough-cookie jar
      (!store || store.synchronous ? request.jar(store) : new tough.CookieJar(store)),
    enumerable: false,
    configurable: false,
    writable: false,
  });

  /**
   * @method use
   * @memberof! HttpClient#
   * @param {Object} plugin
   * @param {String} plugin.name
   * @param {PluginHook[]} [plugin.onRequest]
   * @param {PluginHook[]} [plugin.onResponse]
   * @param {Object} [options]
   * @returns {Object} a clone of this instance's defaults object
   */
  Object.defineProperty(instance, 'use', {
    value: (plugin, options) => {
      mountPlugin(instance, phaseLists, plugin, options);
      return instance;
    },
    enumerable: false,
    configurable: false,
    writable: false,
  });

  /**
   * make a http request with the provided arguments.
   * Request arguments are parsed and compiled to one `options` object, merged with this instance's `defaults`.
   * Then, the `onRequest` phaseList is onvoked with mentioned `options` as well as a {@link hookState}.
   * After all {@link PluginHookHandler} have completed, the options from {@link OnRequestContext} are used to invoke
   * {@link https://github.com/request/request|request}. The result is used to resolve this method's returned {@link RequestPromise}.
   * This is useful if you want to work with {@link https://github.com/request/request|request}'s' {@link https://github.com/request/request#streaming|Streaming} API.
   * After a response is received, a {@link OnResponseContext} is created and passed through the `onResponse`
   * phaseList before finally your provided {@link RequestArgCallback} is invoked.
   * @method makeRequest
   * @memberof! HttpClient#
   * @param {RequestArgUri}       uri
   * @param {RequestArgOptions}   [options]
   * @param {RequestArgCallback}  [callback]
   * @returns {RequestPromise}
   */
  Object.defineProperty(instance, 'makeRequest', {
    value: (...args) => makeRequest(instance, phaseLists, ...args),
    enumerable: false,
    configurable: false,
    writable: false,
  });

  /**
   * Same as {@link HttpClient#makeRequest} but forces `options.method` to `GET`
   * @method get
   * @memberof! HttpClient#
   * @param {RequestArgUri}       uri
   * @param {RequestArgOptions}   [options]
   * @param {RequestArgCallback}  [callback]
   * @returns {RequestPromise}
   */

  /**
   * Same as {@link HttpClient#makeRequest} but forces `options.method` to `PUT`
   * @method put
   * @memberof! HttpClient#
   * @param {RequestArgUri}       uri
   * @param {RequestArgOptions}   [options]
   * @param {RequestArgCallback}  [callback]
   * @returns {RequestPromise}
   */

  /**
   * Same as {@link HttpClient#makeRequest} but forces `options.method` to `POST`
   * @method post
   * @memberof! HttpClient#
   * @param {RequestArgUri}       uri
   * @param {RequestArgOptions}   [options]
   * @param {RequestArgCallback}  [callback]
   * @returns {RequestPromise}
   */

  /**
   * Same as {@link HttpClient#makeRequest} but forces `options.method` to `DELETE`
   * @method del
   * @memberof! HttpClient#
   * @param {RequestArgUri}       uri
   * @param {RequestArgOptions}   [options]
   * @param {RequestArgCallback}  [callback]
   * @returns {RequestPromise}
   */

  /**
   * Same as {@link HttpClient#makeRequest} but forces `options.method` to `HEAD`
   * @method head
   * @memberof! HttpClient#
   * @param {RequestArgUri}       uri
   * @param {RequestArgOptions}   [options]
   * @param {RequestArgCallback}  [callback]
   * @returns {RequestPromise}
   */

  /**
   * Same as {@link HttpClient#makeRequest} but forces `options.method` to `OPTIONS`
   * @method options
   * @memberof! HttpClient#
   * @param {RequestArgUri}       uri
   * @param {RequestArgOptions}   [options]
   * @param {RequestArgCallback}  [callback]
   * @returns {RequestPromise}
   */
  ['get', 'put', 'post', 'del', 'head', 'options'].forEach((method) => {
    const requestMethod = method === 'del' ? 'DELETE' : method.toUpperCase();

    const methodFn = (...args) => {
      // initialize provided arguments into params object
      // set request method
      const requestParams = Object.assign(request.initParams(...args), {
        method: requestMethod,
      });

      // make actual request
      return makeRequest(instance, phaseLists, requestParams);
    };

    Object.defineProperty(instance, method, {
      value: methodFn,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  });

  // finally return the client instance
  return instance;
};

module.exports = httpClient;
