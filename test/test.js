'use strict';

process.env.NODE_DEBUG = 'oniyi-http-client:test';
const logger = require('oniyi-logger')('oniyi-http-client:test');
const _ = require('lodash');
const OniyiHttpClient = require('../');
// const redisStore = require('tough-cookie-redis-store');
// const makeRedisClient = require('make-redis-client');

// const redisClient = new makeRedisClient({});

const client = new OniyiHttpClient({
  defaults: {
    headers: {
      'Accept-Language': 'en-US,en;q=0.8',
      Host: 'httpbin.org',
      'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  },
});

const plugin1 = {
  name: 'plugin-1',
  load: (req, params) => {
    return _.merge({}, params, {
      headers: {
        foo: 'bar',
      },
    });
  },
};

const plugin2 = {
  name: 'plugin-2',
  load: (req, params, callback) => {
    const plugin2Storage = {};
    setTimeout(() => {
      plugin2Storage.name = 'Bam Bam!';

      const originalCallback = params.callback;
      const newParams = _.merge({}, params, {
        headers: {
          'plugin-2': 'plugin-2',
        },
        callback: (err, response, body) => {
          logger.info('Name in this plugin\'s store: %s', plugin2Storage.name);
          return originalCallback(err, response, body);
        },
      });

      callback(null, newParams);
    }, 500);
  },
};

const plugin3 = {
  name: 'plugin-3',
  load: (req, params, callback) => {
    setTimeout(() => {
      callback(null, _.merge({}, params, {
        headers: {
          'plugin-3': 'plugin-3',
        },
      }));
    }, 500);
  },
};

const plugin4 = {
  name: 'plugin-4',
  load: (req, params, callback) => {
    const plugin4Storage = {};
    setTimeout(() => {
      plugin4Storage.name = 'Fred!';
      const originalCallback = params.callback;

      const newParams = _.merge({}, params, {
        headers: {
          foo: 'baz',
          'plugin-4': 'plugin-4',
        },
        callback: (err, response, body) => {
          logger.info('Name in this plugin\'s store: %s', plugin4Storage.name);
          return originalCallback(err, response, body);
        },
      });
      callback(null, newParams);
    }, 500);
  },
};

client
  .use(plugin1)
  .use(plugin2)
  .use(plugin3)
  .use(plugin4)
  .use('async-cookie-jar');

// client.makeRequest('http://httpbin.org/cookies/set?name=value', {
client.makeRequest('http://httpbin.org/headers', {
  method: 'GET',
    // jar: client.jar(new redisStore(redisClient))
}, (err, response, body) => {
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
