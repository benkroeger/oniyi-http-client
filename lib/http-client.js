'use strict';

// node core modules

// 3rd party modules
const request = require('request');
const _ = require('lodash');
const debug = require('debug')('oniyi:http-client');

// internal modules
const phaseList = require('./phase-list');
const makeRequest = require('./make-request');
const { mountPlugin } = require('./helpers');

/**
 * [httpClientFactory description]
 * @param  {Object}   [params={}] [description]
 * @param  {Object}   [params.defaults={}]
 * @param  {Array}    [params.requestPhases=[]]
 * @param  {Array}    [params.responsePhases=[]]
 * @return {[type]}             [description]
 */
const httpClientFactory = (params = {}) => {
  debug('creating new httpClient instance with %o', params);

  const { defaults = {} } = params;
  const instance = {};
  const phaseLists = ['request', 'response'].reduce(
    (result, name) => Object.assign(result, { [name]: phaseList(params[`${name}Phases`] || []) }),
    {}
  );

  Object.defineProperty(instance, 'defaults', {
    get() {
      return _.cloneDeep(defaults);
    },
    enumerable: true,
    configurable: false,
  });

  Object.defineProperty(instance, 'use', {
    get() {
      return (...args) => {
        mountPlugin(instance, phaseLists, ...args);
        return instance;
      };
    },
    enumerable: false,
    configurable: false,
  });

  Object.defineProperty(instance, 'makeRequest', {
    get() {
      return (...args) => makeRequest(instance, phaseLists, ...args);
    },
    enumerable: false,
    configurable: false,
  });

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
      get() { return methodFn; },
      enumerable: false,
      configurable: false,
    });
  });

  // finally return the client instance
  return instance;
};

module.exports = httpClientFactory;
