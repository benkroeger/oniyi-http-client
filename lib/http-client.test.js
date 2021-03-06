// node core modules

// 3rd party modules
import test from 'ava';
import _ from 'lodash';

// internal modules
import httpClient from './http-client';

(() => {
  const client = httpClient();
  [
    'jar',
    'use',
    'makeRequest',
    'get',
    'put',
    'post',
    'del',
    'head',
    'options',
  ].forEach((methodName) =>
    test(`client instance exposes method '${methodName}'`, (t) => {
      t.true(
        _.isFunction(client[methodName]),
        `client should have "${methodName}" method`,
      );
    }),
  );
})();

(() => {
  const client = httpClient();
  ['makeRequest', 'get', 'put', 'post', 'del', 'head', 'options'].forEach(
    (methodName) =>
      test(`'${methodName}' method returns a Promise `, (t) => {
        const returnValue = client[methodName]();
        const resolved = Promise.resolve(returnValue);
        t.is(returnValue, resolved);
      }),
  );
})();

test("'use' method returns client instance", (t) => {
  const client = httpClient();
  const returnValue = client.use({ name: 'noop' });

  t.is(returnValue, client);
});
