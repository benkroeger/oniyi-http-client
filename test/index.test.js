// node core modules

// 3rd party modules
import test from 'ava';
import _ from 'lodash';

// internal modules
import { initContext } from './fixtures';
import plugins from './fixtures/plugins';

test.beforeEach(initContext);

/* Successful scenarios validations */

test.cb('makeRequest: validate loading of plugins, with correspondent phases, by using callback', (t) => {
  const { client } = t.context;

  client
    .use(plugins.plugin2, 'foo')
    .use(plugins.plugin3, 'bar')
    .use(plugins.plugin4, 'bar:after');

  const requestOptions = {
    method: 'GET',
  };

  client.makeRequest('/test', requestOptions, (err, response) => {
    t.ifError(err);
    // grab validations set from plugin-2 and plugin-3
    const { plugin2propsValidations, plugin3propsValidations } = response.request;
    _.forEach(plugin2propsValidations, (validationResult) => {
      t.true(validationResult);
    });
    _.forEach(plugin3propsValidations, (validationResult) => {
      t.true(validationResult);
    });

    t.end();
  });
});

test('makeRequest: validate loading of plugins, with correspondent phases, by returning a promise', async(t) => {
  const { client } = t.context;

  client
    .use(plugins.plugin2, 'foo');

  const requestOptions = {
    method: 'GET',
  };

  const request = await client.makeRequest('/test', requestOptions);
  // grab validations set from plugin-2
  const { plugin2propsValidations } = request;
  _.forEach(plugin2propsValidations, (validationResult) => {
    t.true(validationResult);
  });
});

/* Error / Wrong input scenarios validations */

test.cb('get: error validation of plugins loaded in different phase then expected', (t) => {
  const { client } = t.context;

  client
    .use(plugins.plugin2, 'foo')
    .use(plugins.plugin3, 'foo:before');

  const requestOptions = {
    method: 'GET',
  };

  client.get(requestOptions, (err, response) => {
    t.ifError(err);
    const { plugin2propsValidations, plugin3propsValidations } = response.request;
    _.forEach(plugin2propsValidations, (validationResult) => {
      if (validationResult !== true) {
        t.is(validationResult, 'Make sure that plugins are in the correct order');
      }
    });
    _.forEach(plugin3propsValidations, (validationResult) => {
      if (validationResult !== true) {
        t.is(validationResult, 'Make sure that plugins are in the correct order');
      }
    });

    t.end();
  });
});

test('get: error validation of plugins loaded in different phase then expected, by returning a promise', async (t) => {
  const { client } = t.context;

  client
    .use(plugins.plugin2, 'foo')
    .use(plugins.plugin3, 'foo:before');

  const requestOptions = {
    method: 'GET',
  };

  const request = await client.get(requestOptions);

  const { plugin2propsValidations, plugin3propsValidations } = request;
  _.forEach(plugin2propsValidations, (validationResult) => {
    if (validationResult !== true) {
      t.is(validationResult, 'Make sure that plugins are in the correct order');
    }
  });
  _.forEach(plugin3propsValidations, (validationResult) => {
    if (validationResult !== true) {
      t.is(validationResult, 'Make sure that plugins are in the correct order');
    }
  });
});

test.cb('get: error validation when "load" method is not provided', (t) => {
  const { client } = t.context;

  client
    .use({ name: 'plugin without load' });

  const requestOptions = {
    method: 'GET',
  };

  client.get(requestOptions, (err) => {
    t.is(err.message, 'Plugin [plugin without load]: property "load" must be of type function');
    t.end();
  });
});

test.cb('get: error validation when plugin "name" is not provided', (t) => {
  const { client } = t.context;

  client
    .use({ load: (req, opt, cb) => cb() });

  const requestOptions = {
    method: 'GET',
  };

  client.get(requestOptions, (err) => {
    t.is(err.message, 'plugin.name must be a string');
    t.end();
  });
});

test('get: error validation when plugin "name" is not provided, by using promise', (t) => {
  const { client } = t.context;

  client
    .use({ load: (req, opt, cb) => cb() });

  const requestOptions = {
    method: 'GET',
  };

  return client.get(requestOptions)
    .catch(err => t.is(err.message, 'plugin.name must be a string'));
});
