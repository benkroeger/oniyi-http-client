'use strict';

// node core modules

// 3rd party modules

// internal modules

const timestampHandler = (phaseName, hookState, next) => {
  Object.assign(hookState, {
    [phaseName]: new Date(),
  });
  next();
};

module.exports = {
  timestampHandler,
};
