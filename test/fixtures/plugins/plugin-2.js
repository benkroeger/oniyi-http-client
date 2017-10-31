// node core modules

// 3rd party modules
const _ = require('lodash');

// internal modules
const {
  // constant values added by plugin-1
  plugin1,
  fooPlugin1,
  uriPlugin1,
  // constant values added by plugin-2 (and should be received by plugin-3)
  plugin2,
  fooPlugin2,
  uriPlugin2,
} = require('./constants');
const { validateParamsOrder } = require('./utils');

module.exports = {
  name: plugin2,
  load: (req, params, callback) => {
    setTimeout(() => {
      const { foo, uri, headers: { plugin1: paramsPlugin } } = params;

      // this plugin should be run after plugin-1, and
      // receive all changes made on params object
      const plugin2propsValidations = {
        validateFoo: validateParamsOrder(foo, fooPlugin1),
        validateUri: validateParamsOrder(uri, uriPlugin1),
        validateHeaders: validateParamsOrder(paramsPlugin, plugin1),
      };

      const { callback: originalCallback } = params;
      const updatedParams = _.merge(params, {
        headers: {
          plugin2,
        },
        foo: fooPlugin2,
        uri: uriPlugin2,
        plugin2propsValidations,
        callback: (err, response, body) => {
          // TODO: validate response phase list
          return originalCallback(err, response, body);
        },
      });

      callback(null, updatedParams);
    }, 500);
  },
};
