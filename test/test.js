'use strict';
var OniyiHttpClient = require('../');
// var redisStore = require('tough-cookie-redis-store');
// var makeRedisClient = require('make-redis-client');

// var redisClient = new makeRedisClient({});

var client = new OniyiHttpClient({
    requestOptions: {
      headers: {
        "Accept-Language": "en-US,en;q=0.8",
        "Host": "httpbin.org",
        "Accept-Charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    },

    supportAsyncCookieJar: false
  })
  .registerPlugin({
    name: 'plugin-1',
    onRequest: function(params) {
      params.headers = params.headers || {};
      params.headers.foo = 'bar';
      return params;
    }
  })
  .registerPlugin({
    name: 'plugin-2',
    storesData: true,
    onRequest: function(params, store, callback) {
      setTimeout(function() {
        params.headers = params.headers || {};
        params.headers['plugin-2'] = 'plugin-2';
        store.name = 'Bam Bam!';
        callback(null, params);
      }, 500);
    },
    callback: function(next, store, err, response, body) {
      console.log('Name in this plugin\'s store: %s', store.name);
      
      next.call(this, err, response, body);
    }
  })
  .registerPlugin({
    name: 'plugin-3',
    onRequest: function(params, callback) {
      setTimeout(function() {
        params.headers = params.headers || {};
        params.headers['plugin-3'] = 'plugin-3';
        callback(null, params);
      }, 500);
    }
  })
  .registerPlugin({
    name: 'plugin-4',
    storesData: true,
    onRequest: function(params, store, callback) {
      setTimeout(function() {
        params.headers = params.headers || {};
        params.headers.foo = 'baz';
        params.headers['plugin-4'] = 'plugin-4';
        store.name = 'Fred!';
        callback(null, params);
      }, 500);
    },
    callback: function(next, store, err, response, body) {
      console.log('Name in this plugin\'s store: %s', store.name);
      next.call(this, err, response, body);
    }
  })
  .registerPlugin('async-cookie-jar');


client.makeRequest('http://httpbin.org/headers', {
  method: 'GET',
  // jar: client.jar(new redisStore(redisClient))
}, function(err, response, body) {
  if (err) {
    console.log('got an error');
    if (err.stack) {
      console.log(err.stack);
    } else {
      console.log(err);
    }
    process.exit(0);
  }
  if (response) {
    console.log('statusCode: %d', response.statusCode);
    console.log('headers: ', response.headers);
    console.log('body: ', body);
  }
  process.exit(0);
});
