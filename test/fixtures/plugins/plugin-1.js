// node core modules

// 3rd party modules
const _ = require('lodash');

// internal modules
const { plugin1, fooPlugin1, uriPlugin1 } = require('./constants');

module.exports = {
  name: plugin1,
  load: (req, params, callback) => {
    setTimeout(() => {
      // update params with some changes
      const updatedParams = _.merge(params, {
        headers: {
          plugin1,
        },
        foo: fooPlugin1,
        uri: uriPlugin1,
      });

      callback(null, updatedParams);
    }, 300);
  },
};
