'use strict';

// node core modules

// 3rd party modules
// const debug = require('debug')('oniyi:http-client');

// internal modules

const URL_WITH_PROTOCOL_REGEX = /:?\/\//;

module.exports = params => {
  const result = { ...params };
  // used from the original request module source
  // https://github.com/request/request/blob/master/request.js#L203
  // in commit #777581d5c4fd6d7034ad80d06357f176b14e4495
  // People use this property instead all the time, so support it
  if (!result.uri && result.url) {
    result.uri = result.url;
    delete result.url;
  }

  const { uri, baseUrl } = result;
  if (baseUrl && URL_WITH_PROTOCOL_REGEX.test(uri)) {
    if (uri.startsWith(baseUrl)) {
      delete result.baseUrl;
    }
  }

  return result;
};
