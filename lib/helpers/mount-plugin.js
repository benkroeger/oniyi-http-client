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

    /**
     * @typedef   {Object} PluginHook
     * @property  {string}            phaseName Name of the phase that `handler` should be executed in.
     *                                          value can include pseudo-phase postfix ':before' or ':after'
     *                                          (e.g. 'initial:after' where 'initial' is the actual phaseName and
     *                                          ':after' the pseudo phase)
     * @property  {PluginHookHandler} handler   handler function that is invoked when running through the according phase
     */

    /**
     * @typedef {function} PluginHookHandler
     * @param   {Object}    context An object with the currently available request context.
     *                              Hooks in the `onRequest` phaseList receive an {@link OnRequestContext}
     *                              while hooks that run in the `onResponse` phaseList receive an {@link OnResponseContext}
     * @param   {function}  next    callback function that must be invoked once the handler
     *                              function completed it's operations
     */

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
