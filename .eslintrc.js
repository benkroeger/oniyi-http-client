'use strict';

// node core

// third-party

// internal

module.exports = {
  parserOptions: {
    sourceType: 'script',
    ecmaFeatures: {
      jsx: false,
    },
  },
  env: {
    jest: true,
    node: true,
  },
  plugins: ['prettier'],
  extends: ['airbnb-base', 'prettier'],
  rules: {
    strict: ['error', 'safe'],
    'prettier/prettier': 'error',
    // disallow dangling underscores in identifiers
    // https://eslint.org/docs/rules/no-underscore-dangle
    'no-underscore-dangle': [
      'error',
      {
        allow: ['_id'],
        allowAfterThis: false,
        allowAfterSuper: false,
        enforceInMethodNames: true,
      },
    ],
  },
};
