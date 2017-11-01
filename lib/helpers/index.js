'use strict';

// node core modules

// 3rd party modules
const logger = require('oniyi-logger')('oniyi:http-client');

// internal modules

const parseUri = (params) => {
  const result = Object.assign({}, params);

  // used from the original request module source
  // https://github.com/request/request/blob/master/request.js#L203
  // in commit #777581d5c4fd6d7034ad80d06357f176b14e4495
  // People use this property instead all the time, so support it
  if (!result.uri && result.url) {
    result.uri = result.url;
    delete result.url;
  }

  const { uri, baseUrl } = result;
  if (baseUrl && /:?\/\//.test(uri)) {
    if (uri.startsWith(baseUrl)) {
      delete result.baseUrl;
    }
  }

  return result;
};

const incrementLoadedPlugins = (hookState) => {
  const { pluginsLoaded } = hookState;
  Object.assign(hookState, {
    pluginsLoaded: pluginsLoaded + 1,
  });
};

const timePicker = (time) => {
  const computedTime = time / 1000;
  if (computedTime < 1) {
    return `${time}ms`;
  }

  return `${computedTime}s`;
};

const displayPluginsLoadingData = (hookState) => {
  const { 'initial:before': start, 'final:after': end, pluginsLoaded } = hookState;
  // need to keep reference to plugins loading time,
  // in order to compare it with loading time of other (potential) phase-lists
  // that might share this context's hook state
  Object.assign(hookState, {
    pluginsLoadingTime: (end - start),
  });
  logger.info(`[${pluginsLoaded}] plugins loaded in ${timePicker(hookState.pluginsLoadingTime)}`);
};


module.exports = {
  parseUri,
  displayPluginsLoadingData,
  incrementLoadedPlugins,
};
