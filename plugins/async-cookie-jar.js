'use strict';

// node core modules

// 3rd party modules
const async = require('async');
const request = require('request');

// internal modules

const requestJarPrototype = Object.getPrototypeOf(request.jar());

function putCookiesInJar(setCookieHeaders, completeRequestURI, cookieJar, callback) {
  const eachArray = (typeof setCookieHeaders === 'string') ? [setCookieHeaders] : setCookieHeaders;
  async.each(eachArray, (setCookieHeader, iteratorCallback) => {
    cookieJar.setCookie(setCookieHeader, completeRequestURI, iteratorCallback);
  }, callback);
}

function isRequestJar(jar) {
  if (!jar || typeof jar === 'boolean') {
    return true;
  }

  return Object.getPrototypeOf(jar) === requestJarPrototype;
}

module.exports = {
  name: 'async-cookie-jar',
  load: (req, oParams, callback) => {
    // skip if we have a cookie jar that can be handled by the request module
    if (isRequestJar(oParams.jar)) {
      callback(null, oParams);
      return;
    }

    const params = Object.assign({}, oParams);
    const cookieJar = params.jar;

    // retrieve cookies from jar asynchronously
    cookieJar.getCookieString(params.uri.href, (err, cookieString) => {
      if (err) {
        callback(err);
        return;
      }

      // remove cookieJar from the params so that "request" doesn't try to handle it
      delete params.jar;

      // write cookies from jar to the request headers,
      // don't override existing cookies
      params.headers = params.headers || {};
      params.headers.cookie = cookieString + (params.headers.cookie ? `; ${params.headers.cookie}` : '');

      // the "response" event is emitted on each response, that includes redirects
      req.on('response', (response) => {
        // do we have a response object including the set-cookie header
        if (response && response.headers && response.headers['set-cookie']) {
          const completeRequestURI = response.request.uri.href;

          // write received cookies to our jar
          putCookiesInJar(response.headers['set-cookie'], completeRequestURI, cookieJar, (cookieErr) => {
            if (cookieErr) {
              req.emit('error', cookieErr);
            }
          });
        }
      });

      callback(null, params);
    });
  },
};
