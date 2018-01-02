'use strict';

// node core modules

// 3rd party modules

// internal modules
const httpClient = require('./http-client');

/**
 * The default {@link HttpClient} instance. Can be used without any further configuration
 * @name oniyi-http-client
 * @exports oniyi-http-client
 * @type {HttpClient}
 *
 * @example <caption>Use default instance</caption>
 * const httpClient = require('oniyi-http-client');
 * httpClient.get('http://httpbin.org/headers', {}, (err, response, body) => {
 *  if (err) {
 *    // handle error here
 *    return;
 *  }
 *  // do something with response and / or body
 * });
 *
 *
 */
const defaultInstance = httpClient();

/**
 * Create a new {@link HttpClient} instance.
 * Use this method to create your own client instances and mount plugins for
 * your specific request scenarios
 * @param   {Object}      [options={}]
 * @param   {Object}      [options.defaults]      default request {@link https://github.com/request/request#requestoptions-callback|options} for the new instance.
 *                                        Will be merged into options provided with each request via {@link https://lodash.com/docs/4.17.4#defaultsDeep|_.defaultsDeep()}
 * @param   {String[]}    [options.requestPhases] complete list of phase names for the `onRequest` phaseList.
 *                                        must include the names `initial` and `final`
 * @param   {String[]}    [options.responsePhases] complete list of phase names for the `onResponse` phaseList.
 *                                        must include the names `initial` and `final`
 * @return  {HttpClient}  The newly created {@link HttpClient} instance
 *
 * @example <caption>with request defaults</caption>
 * const httpClient = require('oniyi-http-client');
 * const customClient = httpClient.create({
 *  defaults: {
 *    headers: {
 *      'custom': 'foo',
 *    },
 *    json: true,
 *  }
 * });
 *
 * customClient.get('http://httpbin.org/headers', {}, (err, response, body) => {
 *  if (err) {
 *    // handle error here
 *    return;
 *  }
 *  console.log(body.headers.custom)
 *  // will log `foo`
 * });
 *
 * @example <caption>with custom phases</caption>
 * const httpClient = require('oniyi-http-client');
 * const customClient = httpClient.create({
 *  requestPhases: ['early', 'initial', 'middle', 'final'],
 *  responsePhases: ['initial', 'middle', 'final', 'end'],
 * });
 */
const create = options => httpClient(options);

module.exports = defaultInstance;
module.exports.create = create;
