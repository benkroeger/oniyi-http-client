// node core modules

// 3rd party modules
const _ = require('lodash');

// internal modules
const { plugin1, fooPlugin1, uriPlugin1 } = require('./constants');

module.exports = {
  name: plugin1,
  load: (req, params, callback) => {
    setTimeout(() => {
      const originalCallback = params.callback;

      // update params with some changes
      const updatedParams = _.merge(params, {
        headers: {
          plugin1,
        },
        foo: fooPlugin1,
        uri: uriPlugin1,
        callback: (err, response, body) => {
          // TODO: validate response phase list
          return originalCallback(err, response, body);
        },
      });

      callback(null, updatedParams);
    }, 500);
  },
};
