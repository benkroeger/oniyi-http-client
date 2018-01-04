// node core modules

// 3rd party modules
import test from 'ava';
import _ from 'lodash';

// internal modules
import oniyiHttpClient from '../lib';

(() => {
  ['create', 'jar', 'use', 'makeRequest', 'get', 'put', 'post', 'del', 'head', 'options'].forEach(methodName =>
    test(`oniyiHttpClient instance exposes method '${methodName}'`, t =>
      t.true(_.isFunction(oniyiHttpClient[methodName]), `oniyiHttpClient should have "${methodName}" method`)));
})();

(() => {
  ['makeRequest', 'get', 'put', 'post', 'del', 'head', 'options'].forEach(methodName =>
    test(`'${methodName}' method returns a Promise `, (t) => {
      const returnValue = oniyiHttpClient[methodName]();
      const resolved = Promise.resolve(returnValue);
      t.is(returnValue, resolved);
    }));
})();

test("'use' method returns client instance", (t) => {
  const returnValue = oniyiHttpClient.use({ name: 'noop' });

  t.is(returnValue, oniyiHttpClient);
});
