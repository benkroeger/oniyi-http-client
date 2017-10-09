'use strict';

// node core modules
const util = require('util');
const stream = require('stream');
const url = require('url');

// 3rd party modules
const request = require('request');
const logger = require('oniyi-logger')('oniyi:http-client:request');
const _ = require('lodash');

// internal modules
const { applyPlugins } = require('./helpers');

function Request(options, plugins) {
  const self = this;

  // become a duplex stream
  stream.Duplex.call(self);
  self.init(options, plugins);
}

util.inherits(Request, stream.Duplex);
// _read(size) and _write(chunk, encoding, callback)

Request.prototype.init = function requestInit(params, plugins) {
  const self = this;
  self.dests = self.dests || [];

  const options = _.assign({}, params);
  // keep a reference to the originally provided callback function
  const { callback } = options;

  // make sure, the original callback is only called once
  let callbackCalled = false;
  options.callback = (err, response, body) => {
    if (callbackCalled) {
      logger.warn('multiple attempts to call request callback function');
      return false;
    }

    callbackCalled = true;
    return callback(err, response, body);
  };

  self.on('error', options.callback.bind());
  self.on('complete', options.callback.bind(null, null));

  // handle baseUrl and uri parameters

  // If there's a baseUrl, then use it as the base URL (i.e. uri must be
  // specified as a relative path and is appended to baseUrl).
  if (options.baseUrl) {
    if (typeof options.baseUrl !== 'string') {
      return self.emit('error', new Error('options.baseUrl must be a string'));
    }

    if (typeof options.uri !== 'string') {
      return self.emit('error', new Error('options.uri must be a string when using options.baseUrl'));
    }

    // do not allow absolute uri's when using options.baseUrl
    if (/:?\/\//.test(options.uri)) {
      return self.emit('error', new Error('options.uri must be a path when using options.baseUrl'));
    }

    // resolve baseUrl and uri
    if (options.uri === '') {
      options.uri = options.baseUrl;
    } else {
      options.uri = url.resolve(options.baseUrl, options.uri);
    }

    delete options.baseUrl;
  }

  // A URI is needed by this point, emit error if we haven't been able to get one
  if (!options.uri) {
    return self.emit('error', new Error('options.uri is a required argument'));
  }

  // If a string URI/URL was given, parse it into a URL object
  if (typeof options.uri === 'string') {
    options.uri = url.parse(options.uri);
  }

  // Some URL objects are not from a URL parsed string and need href added
  if (!options.uri.href) {
    options.uri.href = url.format(options.uri);
  }

  // DEPRECATED: Warning for users of the old Unix Sockets URL Scheme
  if (options.uri.protocol === 'unix:') {
    /* eslint-disable max-len */
    return self.emit(
      'error',
      new Error('`unix://` URL scheme is no longer supported. Please use the format `http://unix:SOCKET:PATH`')
    );
    /* eslint-enable max-len */
  }

  // let plugins manipulate the params object
  return applyPlugins(self, plugins, options, (pluginError, modifiedParams) => {
    if (pluginError) {
      // something went wrong in one of the plugins
      logger.debug(pluginError);
      return self.emit('error', pluginError);
    }

    // initiate new Request with parsed and modified parameters
    return new request.Request(modifiedParams);
  });
};

module.exports = Request;
