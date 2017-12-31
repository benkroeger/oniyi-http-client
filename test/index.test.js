// node core modules

// 3rd party modules
import test from 'ava';
import _ from 'lodash';

// internal modules
import oniyiHttpClient from '../lib';

test('main export is a function', (t) => {
  t.true(_.isFunction(oniyiHttpClient));
});

test('client instance created with main export has `jar` method', (t) => {
  const client = oniyiHttpClient({});
  t.true(_.isFunction(client.jar));
});
