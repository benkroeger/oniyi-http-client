'use strict';

// node core modules

// 3rd party modules
const request = require('request');
const tough = require('tough-cookie');

// internal modules
const httpClientFactory = require('./http-client');

const jar = store =>
  // when there is no store or a sync store provided, use default method from request module
  // for async stores, return a new tough-cookie jar
  (!store || store.synchronous ? request.jar(store) : new tough.CookieJar(store));

module.exports = (...args) => {
  const client = httpClientFactory(...args);
  return Object.assign(client, { jar });
};
