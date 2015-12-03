'use strict';

var async = require('async');
var request = require('request');

var requestJarPrototype = Object.getPrototypeOf(request.jar());

function putCookiesInJar(setCookieHeaders, completeRequestURI, cookieJar, callback) {
  if (typeof setCookieHeaders === 'string') {
    setCookieHeaders = [setCookieHeaders];
  }
  async.each(setCookieHeaders, function (setCookieHeader, iteratorCallback) {
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
  load: function (params, callback) {
    // skip if we have a cookie jar that can be handled by the request module
    if (isRequestJar(params.jar)) {
      return callback(null, params);
    }

    var cookieJar = params.jar;

    var originalCallback = params.callback;

    // retrieve cookies from jar asynchronously
    cookieJar.getCookieString(params.uri.href, function (err, cookieString) {
      if (err) {
        return callback(err);
      }

      // remove cookieJar from the params
      delete params.jar;

      // write cookies from jar to the request headers,
      // don't override existing cookies
      params.headers = params.headers || {};
      params.headers.cookie = cookieString + (params.headers.cookie ? '; ' + params.headers.cookie : '');

      params.callback = function (error, response, body) {
        if (error || !cookieJar) {
          return originalCallback(error, response, body);
        }

        // do we have a response object including the set-cookie header
        if (response && response.headers && response.headers['set-cookie']) {
          var completeRequestURI = response.request.uri.href;

          return putCookiesInJar(response.headers['set-cookie'], completeRequestURI, cookieJar, function (cookieErr) {
            if (cookieErr) {
              return originalCallback(cookieErr, response, body);
            }

            return originalCallback(err, response, body);
          });
        }

        originalCallback(err, response, body);
      };

      return callback(null, params);
    });
  }
};
