// node core modules

// 3rd party modules
import test from 'ava';
import _ from 'lodash';
import sinon from 'sinon';

// internal modules
import httpClientFactory from '../http-client';
import mountPlugin from './mount-plugin';
import phaseList from '../phase-list';

const initHttpClient = params => httpClientFactory(params);
const initPhaseLists = () => ['request', 'response'].reduce(
  (result, listName) => Object.assign(result, {
    [listName]: phaseList(),
  }),
  {}
);

test('mountPlugin is a function', t => t.true(_.isFunction(mountPlugin)));

test.beforeEach((t) => {
  const httpClient = initHttpClient();
  const phaseLists = initPhaseLists();
  Object.assign(t.context, { httpClient, phaseLists });
});

test('throws when plugin is not a plain object', (t) => {
  const { httpClient, phaseLists } = t.context;

  const error = t.throws(() => mountPlugin(httpClient, phaseLists, false), TypeError);
  t.is(error.message, 'plugin argument must be plain object');
});

test('throws when plugin.name is not a string', (t) => {
  const { httpClient, phaseLists } = t.context;

  const error = t.throws(() => mountPlugin(httpClient, phaseLists, { name: false }), TypeError);
  t.is(error.message, 'plugin.name must be a string');
});

test('registers handlers from plugin.onRequest with the request phaseList', (t) => {
  const { httpClient, phaseLists } = t.context;
  const { request: requestPhaseList } = phaseLists;

  const phase = requestPhaseList.find('initial');
  const spy = sinon.spy(phase, 'use');
  const hook1 = { phaseName: 'initial', handler: (ctx, next) => next() };

  const plugin = { name: 'plugin1', onRequest: [hook1] };
  mountPlugin(httpClient, phaseLists, plugin);

  t.true(spy.calledOnce);
});

test('registers handlers from plugin.onResponse with the response phaseList', (t) => {
  const { httpClient, phaseLists } = t.context;
  const { response: responsePhaseList } = phaseLists;

  const phase = responsePhaseList.find('initial');
  const spy = sinon.spy(phase, 'use');
  const hook1 = { phaseName: 'initial', handler: (ctx, next) => next() };

  const plugin = { name: 'plugin1', onResponse: [hook1] };
  mountPlugin(httpClient, phaseLists, plugin);

  t.true(spy.calledOnce);
});

test.cb('registered handlers are executed in correct order', (t) => {
  const { httpClient, phaseLists } = t.context;
  const { request: requestPhaseList } = phaseLists;

  const hook1 = { phaseName: 'initial:before', handler: (ctx, next) => next() };
  const hook2 = { phaseName: 'initial', handler: (ctx, next) => next() };
  const hook3 = { phaseName: 'initial:after', handler: (ctx, next) => next() };
  const hook4 = { phaseName: 'final', handler: (ctx, next) => next() };

  const spy1 = sinon.spy(hook1, 'handler');
  const spy2 = sinon.spy(hook2, 'handler');
  const spy3 = sinon.spy(hook3, 'handler');
  const spy4 = sinon.spy(hook4, 'handler');

  mountPlugin(httpClient, phaseLists, { name: 'plugin1', onRequest: [hook1, hook2, hook3, hook4] });

  const hook5 = { phaseName: 'initial:before', handler: (ctx, next) => next() };
  const hook6 = { phaseName: 'initial', handler: (ctx, next) => next() };
  const hook7 = { phaseName: 'initial:after', handler: (ctx, next) => next() };
  const hook8 = { phaseName: 'final', handler: (ctx, next) => next() };

  const spy5 = sinon.spy(hook5, 'handler');
  const spy6 = sinon.spy(hook6, 'handler');
  const spy7 = sinon.spy(hook7, 'handler');
  const spy8 = sinon.spy(hook8, 'handler');

  mountPlugin(httpClient, phaseLists, { name: 'plugin1', onRequest: [hook5, hook6, hook7, hook8] });

  const ctx = {};
  requestPhaseList.run(ctx, (phaseListError) => {
    t.is(phaseListError, null);
    t.true(spy1.calledBefore(spy2));
    t.true(spy2.calledBefore(spy3));
    t.true(spy3.calledBefore(spy4));

    t.true(spy5.calledBefore(spy6));
    t.true(spy6.calledBefore(spy7));
    t.true(spy7.calledBefore(spy8));

    t.true(spy1.calledBefore(spy5));
    t.true(spy2.calledBefore(spy6));
    t.true(spy3.calledBefore(spy7));
    t.true(spy4.calledBefore(spy8));

    t.true(spy5.calledBefore(spy2));
    t.true(spy6.calledBefore(spy3));
    t.true(spy7.calledBefore(spy4));
    t.end();
  });
});

test('throws when plugin registers handler for non-existing phase name', (t) => {
  const { httpClient, phaseLists } = t.context;

  const hook1 = { phaseName: 'does-not-exist', handler: (ctx, next) => next() };
  const plugin = { name: 'plugin1', onRequest: [hook1] };

  const error = t.throws(() => mountPlugin(httpClient, phaseLists, plugin), Error);
  t.is(
    error.message,
    `can not mount handler from plugin ${plugin.name}. request phase ${hook1.phaseName} is unknown`
  );
});

test.cb('allows mapping phaseNames when mounting plugin', (t) => {
  const { httpClient, phaseLists } = t.context;
  const { request: requestPhaseList } = phaseLists;

  const initialPhase = requestPhaseList.find('initial');
  const finalPhase = requestPhaseList.find('final');

  const spyInitial = sinon.spy(initialPhase, 'use');
  const spyFinal = sinon.spy(finalPhase, 'use');

  const hook1 = { phaseName: 'initial', handler: (ctx, next) => next() };
  const hook2 = { phaseName: 'end', handler: (ctx, next) => next() };

  const spy1 = sinon.spy(hook1, 'handler');
  const spy2 = sinon.spy(hook2, 'handler');

  const options = { requestPhaseMap: { end: 'final' } };
  const plugin = { name: 'plugin1', onRequest: [hook1, hook2] };
  mountPlugin(httpClient, phaseLists, plugin, options);

  t.true(spyInitial.calledOnce);
  t.true(spyFinal.calledOnce);

  const ctx = {};
  requestPhaseList.run(ctx, (phaseListError) => {
    t.is(phaseListError, null);
    t.true(spy1.calledBefore(spy2));
    t.end();
  });
});
