'use strict';

// node core modules

// 3rd party modules
const { PhaseList } = require('loopback-phase');

// internal modules

module.exports = names => {
  const phaseList = new PhaseList();

  phaseList.add(['initial', 'final']);
  if (Array.isArray(names)) {
    phaseList.zipMerge(names);
  }

  return phaseList;
};
