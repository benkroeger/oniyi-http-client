// node core modules

// 3rd party modules
const _ = require('lodash');

// internal modules
const { plugin2, fooPlugin2, uriPlugin2 } = require('./constants');
const { validateParamsOrder } = require('./utils');

module.exports = {
  name: 'plugin3 name',
  load: (req, params, callback) => {
    setTimeout(() => {
      const { foo, uri, headers: { plugin2: paramsPlugin } } = params;

      // make sure that we received changes from plugin2,
      // which might have overwritten changes made by plugin1
      const plugin3propsValidations = {
        validateFoo: validateParamsOrder(foo, fooPlugin2),
        validateUri: validateParamsOrder(uri, uriPlugin2),
        validateHeaders: validateParamsOrder(paramsPlugin, plugin2),
      };

      const originalCallback = params.callback;
      const newParams = _.merge(params, {
        headers: {
          plugin3: 'plugin3',
        },
        foo: 'plugin3 foo updated',
        uri: 'plugin3/uri/updated',
        plugin3propsValidations,
        callback: (err, response, body) => {
          // TODO: validate response phase list
          return originalCallback(err, response, body);
        },
      });

      callback(null, newParams);
    }, 500);
  },
};
