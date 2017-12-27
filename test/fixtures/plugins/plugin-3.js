// node core modules

// 3rd party modules
const _ = require('lodash');

// internal modules
const { plugin2, fooPlugin2, uriPlugin2 } = require('./constants');
const { validateParamsOrder } = require('./utils');

module.exports = {
  name: 'plugin3 name',
  onRequest: [
    {
      phaseName: 'initial',
      handler: (ctx, next) => {
        setTimeout(() => {
          const { foo, uri, headers: { plugin2: paramsPlugin } } = ctx.options;

          // make sure that we received changes from plugin2,
          // which might have overwritten changes made by plugin1
          const plugin3propsValidations = {
            validateFoo: validateParamsOrder(foo, fooPlugin2),
            validateUri: validateParamsOrder(uri, uriPlugin2),
            validateHeaders: validateParamsOrder(paramsPlugin, plugin2),
          };

          _.merge(ctx.options, {
            headers: {
              plugin3: 'plugin3',
            },
            foo: 'plugin3 foo updated',
            uri: 'plugin3/uri/updated',
            plugin3propsValidations,
          });

          next(null, ctx);
        }, 300);
      },
    },
  ],
};
