// node core modules

// 3rd party modules
import test from 'ava';
import _ from 'lodash';

// internal modules
import httpClientFactory from '../lib/http-client';

test('client methods', (t) => {
  const client = httpClientFactory({});

  ['use', 'makeRequest', 'get', 'put', 'post', 'del', 'head', 'options'].forEach(methodName =>
    t.true(_.isFunction(client[methodName]), `client should have "${methodName}" method`));
});

test.cb('simple request', (t) => {
  const client = httpClientFactory({});

  client.get('http://httpstat.us/200', (err, response, body) => {
    t.ifError(err);
    t.log(body);
    t.end();
  });
});

test.cb('with plugin', (t) => {
  const client = httpClientFactory({});

  const plugin = {
    name: 'plugin1',
    onRequest: [
      {
        phaseName: 'initial',
        handler: (ctx, next) => {
          t.log('in plugin -> onRequest:initial');
          next();
        },
      },
    ],
    onResponse: [
      {
        phaseName: 'final',
        handler: (ctx, next) => {
          t.log('in plugin -> onResponse:final');
          next();
        },
      },
    ],
  };

  client.use(plugin);
  client.get('http://httpstat.us/200', (err, response, body) => {
    t.ifError(err);
    t.log(body);
    t.end();
  });
});
