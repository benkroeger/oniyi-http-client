// node core modules

// 3rd party modules
const _ = require('lodash');

// internal modules

module.exports = {
  name: 'plugin4 - used for testing response phase list: TODO',
  load: (req, params, callback) => {
    setTimeout(() => {
      const originalCallback = params.callback;

      const newParams = _.merge(params, {
        headers: {
          plugin4: 'plugin4',
        },
        callback: (err, response, body) =>
          // TODO: validate response phase list
          originalCallback(err, response, body)
        ,
      });

      callback(null, newParams);
    }, 300);
  },
};
