// node core modules

// 3rd party modules
const _ = require('lodash');

// internal modules
const { plugin1, fooPlugin1, uriPlugin1 } = require('./constants');

module.exports = {
  name: plugin1,
  onRequest: [
    {
      phaseName: 'initial',
      handler: (ctx, next) => {
        setTimeout(() => {
          // update params with some changes
          _.merge(ctx.options, {
            headers: {
              plugin1,
            },
            foo: fooPlugin1,
            uri: uriPlugin1,
          });

          next(null, ctx);
        }, 300);
      },
    },
  ],
};
