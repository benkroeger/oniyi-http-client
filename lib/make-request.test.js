// node core modules

// 3rd party modules
import test from 'ava';
import _ from 'lodash';
import sinon from 'sinon';

// internal modules
import httpClientFactory from '../lib/http-client';
import makeRequest from '../lib/make-request';
import mountPlugin from './utils/mount-plugin';
import phaseList from '../lib/phase-list';

const initHttpClient = params => httpClientFactory(params);
const initPhaseLists = () =>
  ['request', 'response'].reduce(
    (result, listName) =>
      Object.assign(result, {
        [listName]: phaseList(),
      }),
    {}
  );

test('makeRequest is a function', t => t.true(_.isFunction(makeRequest)));

test.beforeEach((t) => {
  const httpClient = initHttpClient();
  const phaseLists = initPhaseLists();
  Object.assign(t.context, { httpClient, phaseLists });
});

test('returns a Promise', (t) => {
  const { httpClient, phaseLists } = t.context;

  const returnValue = makeRequest(httpClient, phaseLists);
  const resolved = Promise.resolve(returnValue);
  t.is(returnValue, resolved);
});

test('invokes request phase list', async (t) => {
  const { httpClient, phaseLists } = t.context;

  const spy = sinon.spy(phaseLists.request, 'run');
  await makeRequest(httpClient, phaseLists);
  t.true(spy.calledOnce);
});

test('rejects returned Promise with error from request phase list', async (t) => {
  const { httpClient, phaseLists } = t.context;
  const pluginError = new Error('Error in plugin1');

  mountPlugin(httpClient, phaseLists, {
    name: 'plugin1',
    onRequest: [
      {
        phaseName: 'initial',
        handler: (ctx, next) => next(pluginError),
      },
    ],
  });

  const thrown = await t.throws(makeRequest(httpClient, phaseLists));
  t.is(thrown, pluginError);
});

test.cb('invokes options.callback with error from request phase list', (t) => {
  const { httpClient, phaseLists } = t.context;
  const pluginError = new Error('Error in plugin1');

  mountPlugin(httpClient, phaseLists, {
    name: 'plugin1',
    onRequest: [
      {
        phaseName: 'initial',
        handler: (ctx, next) => next(pluginError),
      },
    ],
  });

  const options = {
    callback: (err) => {
      t.is(err, pluginError);
      t.end();
    },
  };

  makeRequest(httpClient, phaseLists, options).catch((reason) => {
    t.is(reason, pluginError);
  });
});

test.cb('invokes options.callback with error from response phase list', (t) => {
  const { httpClient, phaseLists } = t.context;
  const pluginError = new Error('Error in plugin1');

  mountPlugin(httpClient, phaseLists, {
    name: 'plugin1',
    onResponse: [
      {
        phaseName: 'initial',
        handler: (ctx, next) => next(pluginError),
      },
    ],
  });

  const options = {
    uri: 'http://stat.us/200',
    callback: (err) => {
      t.is(err, pluginError);
      t.end();
    },
  };

  makeRequest(httpClient, phaseLists, options).catch((reason) => {
    t.is(reason, pluginError);
  });
});

test.cb('invokes options.callback with error request', (t) => {
  const { httpClient, phaseLists } = t.context;

  const options = {
    uri: 'https://foo.bar/200',
    callback: (err) => {
      t.is(err.code, 'ENOTFOUND');
      t.end();
    },
  };

  makeRequest(httpClient, phaseLists, options).catch((reason) => {
    t.log(reason);
  });
});

test.cb('invokes options.callback results from response phase list context', (t) => {
  const { httpClient, phaseLists } = t.context;

  const pluginError = undefined;
  const pluginResponse = { id: 1 };
  const pluginBody = { foo: 'bar' };

  mountPlugin(httpClient, phaseLists, {
    name: 'plugin1',
    onResponse: [
      {
        phaseName: 'initial',
        handler: (ctx, next) => {
          Object.assign(ctx, {
            responseError: pluginError,
            response: pluginResponse,
            responseBody: pluginBody,
          });
          next();
        },
      },
    ],
  });

  const options = {
    uri: 'http://stat.us/200',
    callback: (err, response, body) => {
      t.is(err, pluginError);
      t.is(response, pluginResponse);
      t.is(body, pluginBody);
      t.end();
    },
  };

  makeRequest(httpClient, phaseLists, options);
});
