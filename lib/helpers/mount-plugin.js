'use strict';

// node core modules

// 3rd party modules
const _ = require('lodash');
const debug = require('debug')('oniyi:http-client:mount-plugin');

// internal modules

const phaseNameRegex = /^(.+):(before|after)$/;

module.exports = (httpClient, { request: requestPhaseList, response: responsePhaseList }, plugin) => {
  // check plugin type
  // should have name property
  if (!_.isPlainObject(plugin)) {
    throw new TypeError('plugin argument must be plain object');
  }

  const { name } = plugin;

  // verify that we have a name property
  if (!_.isString(name)) {
    const handleError = new TypeError('plugin.name must be a string');
    throw handleError;
  }

  if (Array.isArray(plugin.onRequest)) {
    plugin.onRequest.forEach(({ phaseName, handler }) => {
      const [, mainPhaseName = phaseName, subphase = 'use'] = phaseName.match(phaseNameRegex) || [];
      const phase = requestPhaseList.find(mainPhaseName);

      if (!phase) {
        debug('can not mount handler from plugin %s. phase %s is unknown', name, phaseName);
        return;
      }

      phase[subphase]((ctx, next) => {
        debug('executing request handler for plugin %s in phase %s', name, phaseName);
        handler(ctx, (...args) => {
          debug('finished request handler execution for plugin %s in phase %s', name, phaseName);
          next(...args);
        });
      });

      debug('registered request handler for plugin %s in phase %s', name, phaseName);
    });
  }

  if (Array.isArray(plugin.onResponse)) {
    plugin.onResponse.forEach(({ phaseName, handler }) => {
      const [, mainPhaseName = phaseName, subphase = 'use'] = phaseName.match(phaseNameRegex) || [];
      const phase = responsePhaseList.find(mainPhaseName);

      if (!phase) {
        debug('can not mount handler from plugin %s. phase %s is unknown', name, phaseName);
        return;
      }

      phase[subphase]((ctx, next) => {
        debug('executing response handler for plugin %s in phase %s', name, phaseName);
        handler(ctx, (...args) => {
          debug('finished response handler execution for plugin %s in phase %s', name, phaseName);
          next(...args);
        });
      });

      debug('registered response handler for plugin %s in phase %s', name, phaseName);
    });
  }

  return httpClient;
};
