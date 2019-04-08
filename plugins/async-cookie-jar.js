'use strict';

// node core modules

// 3rd party modules
const async = require('async');
const _ = require('lodash');
const request = require('request');

// internal modules

const requestJarPrototype = Object.getPrototypeOf(request.jar());

function putCookiesInJar(setCookieHeaders, completeRequestURI, cookieJar, callback) {
  const eachArray = typeof setCookieHeaders === 'string' ? [setCookieHeaders] : setCookieHeaders;
  async.each(
    eachArray,
    (setCookieHeader, iteratorCallback) => {
      cookieJar.setCookie(setCookieHeader, completeRequestURI, iteratorCallback);
    },
    callback
  );
}

function isRequestJar(jar) {
  if (!jar || typeof jar === 'boolean') {
    return true;
  }

  return Object.getPrototypeOf(jar) === requestJarPrototype;
}

module.exports = {
  name: 'async-cookie-jar',
  onRequest: [
    {
      phaseName: 'initial',
      handler: (ctx, next) => {
        const { options, hookState } = ctx;
        const { jar: cookieJar } = options;
        // skip if we have a cookie jar that can be handled by the request module
        if (isRequestJar(cookieJar)) {
          next();
          return;
        }

        Object.assign(hookState, {
          isAsyncCookieJar: true,
          cookieJar,
        });

        // retrieve cookies from jar asynchronously
        cookieJar.getCookieString(options.uri.href, (err, cookieString) => {
          if (err) {
            next(err);
            return;
          }

          // remove cookieJar from the options so that "request" doesn't try to handle it
          delete options.jar;

          // write cookies from jar to the request headers,
          // don't override existing cookies
          _.set(
            options,
            'headers.cookie',
            `${cookieString}; ${_.get(options, 'headers.cookie', '')}`
          );

          next();
        });
      },
    },
  ],
  onResponse: [
    {
      phaseName: 'initial',
      handler: (ctx, next) => {
        const { hookState, response } = ctx;
        if (!hookState.isAsyncCookieJar) {
          next();
          return;
        }

        const setCookie = _.get(response, 'headers.set-cookie');

        if (!setCookie) {
          next();
          return;
        }
        // do we have a response object including the set-cookie header
        const completeRequestURI = _.get(response, 'request.uri.href');
        const { cookieJar } = hookState;

        // write received cookies to our jar
        putCookiesInJar(setCookie, completeRequestURI, cookieJar, next);
      },
    },
  ],
};
