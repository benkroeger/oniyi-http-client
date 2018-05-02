'use strict';

// node core modules

// 3rd party modules
// const debug = require('debug')('oniyi:http-client');

// internal modules
const mountPlugin = require('./mount-plugin');
const parseUri = require('./parse-uri');

module.exports = {
  mountPlugin,
  parseUri,
};
