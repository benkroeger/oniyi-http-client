// node core modules

// 3rd party modules
import test from 'ava';

// internal modules
import parseUri from './parse-uri';

test('renames .url to .uri when .uri is falsy', (t) => {
  const params = { url: 'http://www.google.com' };
  const result = parseUri(params);
  t.is(result.uri, params.url);
  t.is(result.url, undefined);
});

test('does not rename .url to .uri when .uri is not falsy', (t) => {
  const params = { uri: true, url: 'http://www.google.com' };
  const result = parseUri(params);
  t.deepEqual(result, params);
  t.not(result.url, undefined);
});

test('removes .baseUrl when .uri includes protocol and starts with .baseUrl', (t) => {
  const params = {
    baseUrl: 'http://www.google.com',
    uri: 'http://www.google.com/foo',
  };
  const result = parseUri(params);
  t.is(result.uri, params.uri);
  t.is(result.baseUrl, undefined);
});

test('does not remove .baseUrl when .uri includes protocol and does not starts with .baseUrl', (t) => {
  const params = {
    baseUrl: 'http://www.google.com',
    uri: 'http://www.google.de/foo',
  };
  const result = parseUri(params);
  t.deepEqual(result, params);
  t.not(result.baseUrl, undefined);
});
