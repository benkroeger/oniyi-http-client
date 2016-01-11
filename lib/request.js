'use strict';

// core modules
var util = require('util');
var path = require('path');
var stream = require('stream');
var url = require('url');

// npm modules
var request = require('request');
var pkg = require(path.resolve(__dirname, '..', 'package.json'));
var logger = require('oniyi-logger')(util.format('%s@v%s:request', pkg.name, pkg.version));

var applyPlugins = require('./helpers/apply-plugins');

function Request(options, plugins) {
  var self = this;

  // become a duplex stream
  stream.Duplex.call(self);
  self.init(options, plugins);
}

util.inherits(Request, stream.Duplex);
// _read(size) and _write(chunk, encoding, callback)

Request.prototype.init = function requestInit(options, plugins) {
  var self = this;
  self.dests = self.dests || [];

  // keep a reference to the originally provided callback function
  var callback = options.callback;

  // make sure, the original callback is only called once
  var callbackCalled = false;
  options.callback = function () {
    if (callbackCalled) {
      logger.warn('multiple attempts to call request callback function');
      return false;
    }

    callbackCalled = true;
    return callback.apply(null, arguments);
  };

  self.on('error', options.callback.bind());
  self.on('complete', options.callback.bind(null, null));

  // handle baseUrl and uri parameters
  // used from the original request module source
  // https://github.com/request/request/blob/master/request.js#L203
  // in commit #777581d5c4fd6d7034ad80d06357f176b14e4495
  // People use this property instead all the time, so support it
  if (!options.uri && options.url) {
    options.uri = options.url;
    delete options.url;
  }

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
    if (options.uri.indexOf('//') === 0 || options.uri.indexOf('://') !== -1) {
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
    return self.emit('error', new Error('`unix://` URL scheme is no longer supported. Please use the format `http://unix:SOCKET:PATH`'));
  }

  // let plugins manipulate the params object
  applyPlugins(self, plugins, options, function (pluginError, modifiedParams) {
    if (pluginError) {
      // something went wrong in one of the plugins
      logger.debug(pluginError);
      return self.emit('error', pluginError);
    }

    // initiate new Request with parsed and modified parameters
    return new request.Request(modifiedParams);
  });


  // self.on('pipe', function (src) {
  //   if (self.ntick && self._started) {
  //     self.emit('error', new Error('You cannot pipe to this stream after the outbound request has started.'));
  //   }
  //   self.src = src;
  //   if (isReadStream(src)) {
  //     if (!self.hasHeader('content-type')) {
  //       self.setHeader('content-type', mime.lookup(src.path));
  //     }
  //   } else {
  //     if (src.headers) {
  //       for (var i in src.headers) {
  //         if (!self.hasHeader(i)) {
  //           self.setHeader(i, src.headers[i])
  //         }
  //       }
  //     }
  //     if (self._json && !self.hasHeader('content-type')) {
  //       self.setHeader('content-type', 'application/json');
  //     }
  //     if (src.method && !self.explicitMethod) {
  //       self.method = src.method;
  //     }
  //   }

  //   // self.on('pipe', function () {
  //   //   console.error('You have already piped to this stream. Pipeing twice is likely to break the request.')
  //   // })
  // });
};

Request.prototype.start = function start() {
  var self = this;
  self.req.on('response', self.onRequestResponse.bind(self));
  self.req.on('error', self.onRequestError.bind(self));
  self.req.on('drain', function () {
    self.emit('drain');
  });
  self.req.on('socket', function (socket) {
    self.emit('socket', socket);
  });

  self.on('end', function () {
    if (self.req.connection) {
      self.req.connection.removeListener('error', connectionErrorHandler)
    }
  });
  self.emit('request', self.req);
};

// Stream API
Request.prototype.pipe = function (dest, opts) {
  var self = this;

  if (self.response) {
    if (self._destdata) {
      self.emit('error', new Error('You cannot pipe after data has been emitted from the response.'));
    } else if (self._ended) {
      self.emit('error', new Error('You cannot pipe after the response has been ended.'));
    } else {
      stream.Stream.prototype.pipe.call(self, dest, opts);
      self.pipeDest(dest);
      return dest;
    }
  } else {
    self.dests.push(dest);
    stream.Stream.prototype.pipe.call(self, dest, opts);
    return dest;
  }
};

Request.prototype.write = function () {
  var self = this;
  if (self._aborted) {
    return;
  }

  if (!self._started) {
    self.start();
  }
  return self.req.write.apply(self.req, arguments);
};

Request.prototype.end = function (chunk) {
  var self = this;
  if (self._aborted) {
    return;
  }

  if (chunk) {
    self.write(chunk);
  }
  if (!self._started) {
    self.start();
  }
  self.req.end();
};

Request.prototype.pause = function () {
  var self = this;
  if (!self.responseContent) {
    self._paused = true;
  } else {
    self.responseContent.pause.apply(self.responseContent, arguments);
  }
};

Request.prototype.resume = function () {
  var self = this;
  if (!self.responseContent) {
    self._paused = false;
  } else {
    self.responseContent.resume.apply(self.responseContent, arguments);
  }
};

Request.prototype.destroy = function () {
  var self = this;
  if (!self._ended) {
    self.end();
  } else if (self.response) {
    self.response.destroy();
  }
};

module.exports = Request;
