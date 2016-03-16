# oniyi-http-client  
[![NPM version][npm-image]][npm-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]  
> Adding a plugin interface to [request](https://www.npmjs.com/package/request) that allows modifications of request parameters and response data

## Installation

```sh
$ npm install --save oniyi-http-client
```

## Usage

**Note:** this module does not support streams, yet

```js
var OniyiHttpClient = require('oniyi-http-client');

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

client.makeRequest('http://httpbin.org/headers', {
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
```

## Using plugins

This creates a plugin named `plugin-2` which adds a request-header with name and value `plugin-2`.
Also, it stores some data in a local variable and overrides the original callback function 
to print that stored data on response. Afterwards it calls the original callback function.

```js
var plugin2 = {
  name: 'plugin-2',
  load: function (req, params, callback) {
    var plugin2Storage = {};
    setTimeout(function () {
      params.headers = params.headers || {};
      params.headers['plugin-2'] = 'plugin-2';

      var name = 'Bam Bam!';

      var originalCallback = params.callback;

      params.callback = function (err, response, body) {
        logger.info('Name in this plugin\'s store: %s', name);
        return originalCallback(err, response, body);
      };

      callback(null, params);
    }, 500);
  }
};

client
  .use(plugin2)
  .makeRequest('http://httpbin.org/headers', {
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

```
## License

Apache-2.0 © [Benjamin Kroeger]()


[npm-image]: https://badge.fury.io/js/oniyi-http-client.svg
[npm-url]: https://npmjs.org/package/oniyi-http-client
[travis-image]: https://travis-ci.org/benkroeger/oniyi-http-client.svg?branch=master
[travis-url]: https://travis-ci.org/benkroeger/oniyi-http-client
[daviddm-image]: https://david-dm.org/benkroeger/oniyi-http-client.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/benkroeger/oniyi-http-client
[coveralls-image]: https://coveralls.io/repos/benkroeger/oniyi-http-client/badge.svg
[coveralls-url]: https://coveralls.io/r/benkroeger/oniyi-http-client
