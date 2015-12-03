'use strict';

// core modules
var url = require('url');

// npm modules
var _ = require('lodash');

module.exports = function (defaults, parsedParams, callback) {

  // merge params with defaults
  var params = _.merge({
    method: 'GET'
  }, defaults, parsedParams);

  // handle baseUrl and uri parameters
  // used from the original request module source
  // https://github.com/request/request/blob/master/request.js#L203
  // in commit #777581d5c4fd6d7034ad80d06357f176b14e4495
  // People use this property instead all the time, so support it
  if (!params.uri && params.url) {
    params.uri = params.url;
    delete params.url;
  }

  // If there's a baseUrl, then use it as the base URL (i.e. uri must be
  // specified as a relative path and is appended to baseUrl).
  if (params.baseUrl) {
    if (typeof params.baseUrl !== 'string') {
      return callback(new Error('options.baseUrl must be a string'));
    }

    if (typeof params.uri !== 'string') {
      return callback(new Error('options.uri must be a string when using options.baseUrl'));
    }

    // do not allow absolute uri's when using options.baseUrl
    if (params.uri.indexOf('//') === 0 || params.uri.indexOf('://') !== -1) {
      return callback(new Error('options.uri must be a path when using options.baseUrl'));
    }

    // resolve baseUrl and uri
    if (params.uri === '') {
      params.uri = params.baseUrl;
    } else {
      params.uri = url.resolve(params.baseUrl, params.uri);
    }

    delete params.baseUrl;
  }

  // A URI is needed by this point, emit error if we haven't been able to get one
  if (!params.uri) {
    return callback(new Error('options.uri is a required argument'));
  }

  // If a string URI/URL was given, parse it into a URL object
  if (typeof params.uri === 'string') {
    params.uri = url.parse(params.uri);
  }

  // Some URL objects are not from a URL parsed string and need href added
  if (!params.uri.href) {
    params.uri.href = url.format(params.uri);
  }

  // DEPRECATED: Warning for users of the old Unix Sockets URL Scheme
  if (params.uri.protocol === 'unix:') {
    return callback(new Error('`unix://` URL scheme is no longer supported. Please use the format `http://unix:SOCKET:PATH`'));
  }

  return callback(null, params);
};
