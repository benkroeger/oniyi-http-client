// node core modules

// 3rd party modules

// internal modules

const validateParamsOrder = (currentPluginParam, previousPluginParam) => (
  currentPluginParam === previousPluginParam
    ? true
    : 'Make sure that plugins are in the correct order');

module.exports = {
  validateParamsOrder,
};
