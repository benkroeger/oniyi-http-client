'use strict';

// node core modules

// 3rd party modules
const request = require('request');
const _ = require('lodash');
const debug = require('debug')('oniyi:http-client:make-request');

// internal modules
const { parseUri } = require('./helpers');

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

  // init hook state
  const hookState = {};

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
      _.set(ctx, 'options.callback', (err, response, body) => {
        const responseCtx = {
          hookState: ctx.hookState,
          options: ctx.options,
          responseError: err,
          responseBody: body,
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
