// node core modules

// 3rd party modules
const _ = require('lodash');

// internal modules
const plugins = require('./plugins');
const oniyiHttpClient = require('../../');

const init = () => {
  const clientParams = {
    defaults: {
      baseUrl: 'http://apps.na.collabserv.com',
      headers: {
        'Accept-Language': 'en-US,en;q=0.8',
        Host: 'apps.na.collabserv.com',
      },
    },
    phaseLists: {
      requestPhaseNames: ['initial', 'foo', 'bar', 'final'],
    },
    plugins: [plugins.plugin1],
  };

  const client = oniyiHttpClient(clientParams);

  return {
    client,
    clientParams,
    oniyiHttpClient,
  };
};

const initContext = t => _.assign(t.context, init());

module.exports = {
  initContext,
};
