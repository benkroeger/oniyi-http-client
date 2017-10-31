'use strict';

// node core modules

// 3rd party modules
const { PhaseList } = require('loopback-phase');
const _ = require('lodash');

// internal modules
const { timestampHandler } = require('./handlers');

const INITIAL_BEFORE = 'initial:before';
const FINAL_AFTER = 'final:after';

const initRequestPhaseList = (names) => {
  const phaseList = new PhaseList();

  phaseList.add(['initial', 'final']);
  if (_.isArray(names)) {
    phaseList.zipMerge(names);
  }

  phaseList.registerHandler(INITIAL_BEFORE, (ctx, next) => {
    timestampHandler(INITIAL_BEFORE, ctx.hookState, next);
  });

  phaseList.registerHandler(FINAL_AFTER, (ctx, next) => {
    timestampHandler(FINAL_AFTER, ctx.hookState, next);
  });

  return phaseList;
};

module.exports = initRequestPhaseList;
