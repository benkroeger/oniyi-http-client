#  [![NPM version][npm-image]][npm-url]  [![Dependency Status][daviddm-image]][daviddm-url]

> Adding a plugin interface to "request" that allows modifications of request parameters and response data.


## Why?

Working with the popular module [request](https://github.com/request/request) for your http requests is awesome. But sometimes you might need to go beyond the standard features.

## Install

```sh
$ npm install --save oniyi-http-client
```


## Usage

```js
var tough = require('tough-cookie');
var OniyiHttpClient = require('oniyi-http-client');

var client = new OniyiHttpClient();

client.registerPlugin('async-cookie-jar')
	// a plugin that only adds a request header and returns the params object synchronusly
	.registerPlugin({
    name: 'plugin-1',
    onRequest: function(params) {
      params.headers = params.headers || {};
      params.headers.foo = 'bar';
      return params;
    }
  })
  // this plugin wwill add a header and store some data in it's own storage
  // setTimeout is used to simulate async callback of the params object
  .registerPlugin({
    name: 'plugin-2',
    storesData: true, // this has to be set to true if the plugin wants to use a storage
    onRequest: function(params, store, callback) {
      setTimeout(function() {
        params.headers = params.headers || {};
        params.headers['plugin-2'] = 'plugin-2';
        store.name = 'Bam Bam!';
        callback(null, params);
      }, 500);
    },
    // in callback, this plugin has access to it's storage again
    callback: function(next, store, err, response, body) {
      console.log('Name in this plugin\'s store: %s', store.name);
      // pass arguments on to the next plugin
      next.call(this, err, response, body);
    }
  });

client.makeRequest('https://www.npmjs.com', {
	jar: new tough.CookieJar(asyncStore)
}, function(err, response, body){
	// do your normal response handling here
});

```


only async onRequest functions can abort the request execution and send response and body data to the callback

## License

MIT © [Benjamin Kroeger]()


[npm-image]: https://badge.fury.io/js/oniyi-http-client.svg
[npm-url]: https://npmjs.org/package/oniyi-http-client
[travis-image]: https://travis-ci.org/benkroeger/oniyi-http-client.svg?branch=master
[travis-url]: https://travis-ci.org/benkroeger/oniyi-http-client
[daviddm-image]: https://david-dm.org/benkroeger/oniyi-http-client.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/benkroeger/oniyi-http-client
