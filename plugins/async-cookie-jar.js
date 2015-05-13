'use strict';

var _ = require('lodash'),
  async = require('async'),
  request = require('request');

var requestJarPrototype = Object.getPrototypeOf(request.jar());

function putCookiesInJar(setCookieHeaders, completeRequestURI, cookieJar, callback) {
  if (typeof setCookieHeaders === 'string') {
    setCookieHeaders = [setCookieHeaders];
  }
  async.each(setCookieHeaders, function(setCookieHeader, callback) {
    cookieJar.setCookie(setCookieHeader, completeRequestURI, callback);
  }, callback);
}

function isRequestJar(jar) {
  if (!jar || typeof jar === 'boolean') {
    return true;
  }

  return (Object.getPrototypeOf(jar) === requestJarPrototype);
}

module.exports = {
  name: 'async-cookie-jar',
  storesData: true,
  onRequest: function(params, storage, callback) {
    // skip if we have a cookie jar that can be handled by the request module
    if (isRequestJar(params.jar)) {
      return callback(null, params);
    }

    var cookieJar = params.jar;

    // retrieve cookies from jar asynchronously
    cookieJar.getCookieString(params.uri.href, function(err, cookieString) {
      if (err) {
        return callback(err);
      }

      // copy params and remove cookieJar from the copy
      var newParams = _.merge({}, params);
      delete newParams.jar;

      // write cookies from jar to the request headers,
      // don't override existing cookies
      newParams.headers = newParams.headers || {};
      newParams.headers.cookie = cookieString + ((newParams.headers.cookie) ? '; ' + newParams.headers.cookie : '');

      // remember the async cookie jar in this plugin's storage
      storage.cookieJar = cookieJar;

      return callback(null, newParams);
    });
  },
  callback: function(next, storage, err, response, body) {
    var self = this;

    if (!storage.cookieJar || err) {
      return next.call(self, err, response, body);
    }

    // not checking for error here...
    // do we have a response object including the set-cookie header
    if (response && response.headers && response.headers['set-cookie'] && response.request.uri.href) {
      return putCookiesInJar(response.headers['set-cookie'], response.request.uri.href, storage.cookieJar, function(cookieErr) {
        if (cookieErr) {
          return next.call(self, cookieErr, response, body);
        }

        return next.call(self, err, response, body);
      });
    }

    next.call(this, err, response, body);
  }
};
