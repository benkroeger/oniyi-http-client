'use strict';

// node core modules

// 3rd party modules
const _ = require('lodash');
const debug = require('debug')('oniyi:http-client:mount-plugin');

// internal modules

const phaseNameRegex = /^(.+):(before|after)$/;

module.exports = (httpClient, phaseLists, plugin, options = {}) => {
  if (!_.isPlainObject(plugin)) {
    throw new TypeError('plugin argument must be plain object');
  }

  if (!_.isString(plugin.name)) {
    throw new TypeError('plugin.name must be a string');
  }

  [
    { hooksArray: plugin.onRequest, listName: 'request' },
    { hooksArray: plugin.onResponse, listName: 'response' },
  ].forEach(({ hooksArray, listName }) => {
    if (!Array.isArray(hooksArray)) {
      return;
    }
    const { [listName]: phaseList } = phaseLists;

    hooksArray.forEach(({ phaseName, handler }) => {
      const [, mainPhaseName = phaseName, subphase = 'use'] = phaseName.match(phaseNameRegex) || [];
      const mappedPhaseName = _.get(options, `${listName}PhaseMap.${mainPhaseName}`, mainPhaseName);
      const phase = phaseList.find(mappedPhaseName);

      if (!phase) {
        throw new Error(`can not mount handler from plugin ${plugin.name}. ${listName} phase ${phaseName} is unknown`);
      }

      phase[subphase]((ctx, next) => {
        debug('executing %s handler for plugin %s in phase %s', listName, plugin.name, phaseName);
        handler(ctx, (...args) => {
          debug('finished %s handler execution for plugin %s in phase %s', listName, plugin.name, phaseName);
          next(...args);
        });
      });

      debug('registered %s handler for plugin %s in phase %s', listName, plugin.name, phaseName);
    });
  });

  return httpClient;
};
