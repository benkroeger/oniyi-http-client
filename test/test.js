'use strict';

process.env.NODE_DEBUG = 'oniyi-http-client:test';
var logger = require('oniyi-logger')('oniyi-http-client:test');

var OniyiHttpClient = require('../');
// var redisStore = require('tough-cookie-redis-store');
// var makeRedisClient = require('make-redis-client');

// var redisClient = new makeRedisClient({});

var client = new OniyiHttpClient({
  defaults: {
    headers: {
      'Accept-Language': 'en-US,en;q=0.8',
      Host: 'httpbin.org',
      'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  }
});

var plugin1 = {
  name: 'plugin-1',
  load: function (req, params) {
    params.headers = params.headers || {};
    params.headers.foo = 'bar';
    return params;
  }
};

var plugin2 = {
  name: 'plugin-2',
  load: function (req, params, callback) {
    var plugin2Storage = {};
    setTimeout(function () {
      params.headers = params.headers || {};
      params.headers['plugin-2'] = 'plugin-2';

      plugin2Storage.name = 'Bam Bam!';

      var originalCallback = params.callback;

      params.callback = function (err, response, body) {
        logger.info('Name in this plugin\'s store: %s', plugin2Storage.name);
        return originalCallback(err, response, body);
      };

      callback(null, params);
    }, 500);
  }
};

var plugin3 = {
  name: 'plugin-3',
  load: function (req, params, callback) {
    setTimeout(function () {
      params.headers = params.headers || {};
      params.headers['plugin-3'] = 'plugin-3';
      callback(null, params);
    }, 500);
  }
};

var plugin4 = {
  name: 'plugin-4',
  load: function (req, params, callback) {
    var plugin4Storage = {};
    setTimeout(function () {
      params.headers = params.headers || {};
      params.headers.foo = 'baz';
      params.headers['plugin-4'] = 'plugin-4';

      plugin4Storage.name = 'Fred!';

      var originalCallback = params.callback;

      params.callback = function (err, response, body) {
        logger.info('Name in this plugin\'s store: %s', plugin4Storage.name);
        return originalCallback(err, response, body);
      };
      callback(null, params);
    }, 500);
  }
};

client
  .use(plugin1)
  .use(plugin2)
  .use(plugin3)
  .use(plugin4)
  .use('async-cookie-jar');

client.makeRequest('http://httpbin.org/cookies/set?name=value', {
// client.makeRequest('http://httpbin.org/headers', {
  method: 'GET'
    // jar: client.jar(new redisStore(redisClient))
}, function (err, response, body) {
  if (err) {
    logger.warn('got an error');
    if (err.stack) {
      logger.error(err.stack);
    } else {
      logger.error(err);
    }
    process.exit(0);
  }
  if (response) {
    logger.debug('statusCode: %d', response.statusCode);
    logger.debug('headers: ', response.headers);
    logger.debug('body: ', body);
  }
  process.exit(0);
});
