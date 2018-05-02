'use strict';

// node core modules

// 3rd party modules
const request = require('request');
const _ = require('lodash');
const debug = require('debug')('oniyi:http-client:make-request');

// internal modules
const { parseUri } = require('./utils');

/**
 * The first argument can be either a `url` or an
 * {@link https://github.com/request/request#requestoptions-callback|`options`}
 * object. The only required option is uri; all others are optional.
 * @typedef {(String|Object)} RequestArgUri
 */

/**
 * The sesond argument can bei either
 * {@link https://github.com/request/request#requestoptions-callback|`options`}
 * object or `callback` function.
 * @typedef {(Object|Function)} RequestArgOptions
 */

/**
 * Callback function, Invoked at the end of response receiving (or in case of error,
 * when the error is generated). Receives three arguments (`err`, `response`, `body`)
 * that are also available in {@link OnResponseContext}
 * @typedef {Function} RequestArgCallback
 */

/**
 * A Promise that resolves to the return value for `request()` after all
 * {@link PluginHookHandler} in the `onRequest` phaseList have completed.
 * If any of the {@link PluginHookHandler}s produces an error,
 * Promise is rejected with that error object.
 * @typedef {Promise} RequestPromise
 */

const makeRequest = (instance, { request: requestPhaseList, response: responsePhaseList }, ...args) => {
  // augment requestParams to properly handle absolute uris
  // merge params with defaults
  const requestOptions = parseUri(_.defaultsDeep(
    // initialize provided arguments into params object
    request.initParams(...args),
    { method: 'GET' },
    instance.defaults
  ));

  debug('making request with options %o', requestOptions);

  /**
   * A Hookstate instance is created for each request and shared across all phases
   * in the `onRequest` and `onResponse` phaseLists. {@link PluginHookHandler} can
   * modify this plain object at will (e.g. persist a timestamp in an `onRequest`
   * phase and read it again in another handler in an `onResponse` phase)
   * @typedef {Object} Hookstate
   */
  const hookState = {};

  /**
   * mutable context object that gets passed through all phases in the `onRequest` phaseList
   * @typedef   {Object}    OnRequestContext
   * @property  {Hookstate} hookState
   * @property  {Object}    options     {@link https://github.com/request/request#requestoptions-callback|request options}
   */
  const ctx = { options: requestOptions, hookState };

  return new Promise((resolve, reject) =>
    requestPhaseList.run(ctx, (requestPhasesError) => {
      // save reference to the original callback
      const callback = _.get(ctx, 'options.callback', _.noop);
      if (requestPhasesError) {
        reject(requestPhasesError);
        callback(requestPhasesError);
        return;
      }

      // override the current callback in order to add new phase list
      // responsible for handling/manipulating a response object
      _.set(ctx, 'options.callback', (responseError, response, responseBody) => {
        /**
         * mutable context object that gets passed through all phases in the `onResponse` phaseList
         * @typedef    {Object}     OnResponseContext
         * @property   {Hookstate}  hookState       this is the {@link Hookstate} instance from
         *                                          this request's {@link OnRequestContext}
         * @property   {Object}     options         the options property frtom this request's {@link OnRequestContext}
         *                                          ({@link https://github.com/request/request#requestoptions-callback|request options})
         * @property   {Error}      [requestError]  an error when applicable (usually from
         *                                          ({@link http://nodejs.org/api/http.html#http_class_http_clientrequest|http.ClientRequest}) object)
         * @property   {Object}     responseBody    the response body (String or Buffer, or JSON object if the json option is supplied)
         * @property   {Object}     response        an http.IncomingMessage
         *                                          ({@link https://nodejs.org/api/http.html#http_class_http_incomingmessage|http.IncomingMessage})
         *                                          object (Response object)
         */
        const responseCtx = {
          hookState: ctx.hookState,
          options: ctx.options,
          responseError,
          responseBody,
          response,
        };

        responsePhaseList.run(responseCtx, (responsePhasesError) => {
          if (responsePhasesError) {
            callback(responsePhasesError);
            return;
          }
          callback(responseCtx.responseError, responseCtx.response, responseCtx.responseBody);
        });
      });

      resolve(new request.Request(ctx.options)); // eslint-disable-line no-new
    }));
};

module.exports = makeRequest;
