'use strict';

// node core modules

// 3rd party modules
const { PhaseList } = require('loopback-phase');
const _ = require('lodash');

// internal modules

const initPhaseList = (names) => {
  const phaseList = new PhaseList();

  phaseList.add(['initial', 'final']);
  if (Array.isArray(names)) {
    phaseList.zipMerge(names);
  }

  return phaseList;
};

const removePhases = (phaseList, listOfNames = []) => {
  listOfNames.forEach(name => phaseList.remove(name));
  return phaseList;
};
/**
 * Responsible for "skipping" phases by provided http request options.
 *
 * @param {Object} phaseLists         List of "PhaseList" objects which phases might need removal
 * @param {Object} requestOptions     Http request options
 * @return {*}
 */
const removePhasesByOptions = (phaseLists, requestOptions) => {
  const { phasesToSkip } = requestOptions;
  if (phasesToSkip) {
    return _.reduce(phaseLists, (result, phaseList, phaseListName) =>
      _.merge(result, {
        [phaseListName]: removePhases(_.cloneDeep(phaseList), phasesToSkip[phaseListName]),
      }), {});
  }

  return phaseLists;
};

module.exports = {
  initPhaseList,
  removePhasesByOptions,
};
