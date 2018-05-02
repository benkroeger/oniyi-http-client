# Oniyi Http Client
> Adding a plugin interface to [request](https://www.npmjs.com/package/request) that allows modifications of request parameters and response data

## Installation

```sh
$ npm install --save oniyi-http-client
```

## Usage

   *Use default instance*  
  ```js
const httpClient = require('oniyi-http-client');
httpClient.get('http://httpbin.org/headers', {}, (err, response, body) => {
 if (err) {
   // handle error here
   return;
 }
 // do something with response and / or body
});
```

   *with request defaults*  
  ```js
const httpClient = require('oniyi-http-client');
const customClient = httpClient.create({
 defaults: {
   headers: {
     'custom': 'foo',
   },
   json: true,
 }
});

customClient.get('http://httpbin.org/headers', {}, (err, response, body) => {
 if (err) {
   // handle error here
   return;
 }
 console.log(body.headers.custom)
 // will log `foo`
});
```
   *with custom phases*  
  ```js
const httpClient = require('oniyi-http-client');
const customClient = httpClient.create({
 requestPhases: ['early', 'initial', 'middle', 'final'],
 responsePhases: ['initial', 'middle', 'final', 'end'],
});
```

## Motivation
"Is there really a need for another http library?" you might ask. There isn't. The actual need is for
the ability to asynchronously hook into the process of making a http request or receiving a response.

I came across this requirement when working with various REST APIs, making requests with a number of
different credentials (representing users logged into my application). Since the flow within my app
provided me with an `user` object that has an async method to retrieve this user's credentials
(e.g. an oauth access-token), I wanted to follow the `DRY` (don't repeat yourself) pattern and not
manually resolve before invoking e.g. [`request`](https://www.npmjs.com/package/request).

Instead I thought it would be much easier to pass the user along with the request options and have
some other module take care of resolving and injecting credentials.

Quickly more use-cases come to mind:
* [credentials](https://www.npmjs.com/package/oniyi-http-plugin-credentials)
* async cookie jars
* [caching](https://www.npmjs.com/package/oniyi-cache)
* [throttling](https://www.npmjs.com/package/oniyi-limiter)

Also, use-cases that require to manipulate some options based on other options (maybe even compiled by
another plugin) can be solved by this phased implementation. Some REST APIs change the resource path
depending on the type of credentials being used. E.g. when using *BASIC* credentials, a path might be
`/api/basic/foo` while when using `oauth` the path changes to `/api/oauth/foo`. This can be accomplished
by using e.g. [oniyi-http-plugin-format-url-template](https://www.npmjs.com/package/oniyi-http-plugin-format-url-template)
in a late phase (`final`) of the onRequest PhaseLists.

## Phases
This HTTP Client supports running multiple plugins / hooks in different phases before making a request
as well as after receiving a response. Both [PhaseLists](https://github.com/strongloop/loopback-phase/blob/master/lib/phase-list.js)
are initiated with the phases `initial` and `final` and [zipMerged](https://github.com/strongloop/loopback-phase/blob/master/lib/phase-list.js#L164)
with `params.requestPhases` and `params.responsePhases` respectively. That means you can add more phases
by providing them in the factory params.

*with custom phases*
  ```js
const httpClient = require('oniyi-http-client');
const customClient = httpClient.create({
 requestPhases: ['early', 'initial', 'middle', 'final'],
 responsePhases: ['initial', 'middle', 'final', 'end'],
});
```

### onRequest
`onRequest` is one of the (currently) two hooks that executes registered plugins in the defined phases.
After all phases have run their handlers successfully, the resulting request options from `ctx.options`
are used to initiate a new `request.Request`. The return value from `request.Request` (a readable and
writable stream) is what the returned `Promise` from any of the request initiating methods from `client`
(`makeRequest`, `get`, `put`, `post`, ...) resolves to.

Handlers in this phaseList must comply with [PluginHookHandler](#PluginHookHandler).
The received context argument is an [OnRequestContext](#OnRequestContext) .

### onResponse
`onResponse` is the second hook and executes registered plugins after receiving the response from `request`
but before invoking `callback` from the request execution. That means plugins using this hook / phases can
work with and modify `err, response, body` before the app's `callback` function is invoked. Here you can do
things like validating response's `statusCode`, parsing response data (e.g. xml to json), caching, reading
`set-cookie` headers and persist in async cookie jars... the possibilities are wide.

Handlers in this phaseList must comply with [PluginHookHandler](#PluginHookHandler).
The received context argument is an [OnResponseContext](#OnResponseContext).

## Using plugins

Every plugin can register any number of handlers for any of the phases available `onRequest` as well as `onResponse`.

The following example creates a plugin named `plugin-2` which adds a request-header with name and value `plugin-2`.
Also, it stores some data in shared state that is re-read on response and printed.

```js
const plugin2 = {
  name: 'plugin-2',
  onRequest: [{
    phaseName: 'initial',
    handler: (ctx, next) => {
      const { options, hookState } = ctx;
      // store something in the state shared across all hooks for this request
      _.set(hookState, 'plugin-2.name', 'Bam Bam!');

      setTimeout(() => {
        _.set(options, 'headers.plugin-2', 'plugin-2');
        next();
      }, 500);
    },
  }],
  onResponse: [{
    phaseName: 'final',
    handler: (ctx, next) => {
      const { hookState } = ctx;
      // read value from state again
      const name = _.get(hookState, 'plugin-2.name');

      setTimeout(() => {
        logger.info('Name in this plugin\'s store: %s', name);
        next();
      }, 500);
    },
  }],
};

client
  .use(plugin2)
  .get('http://httpbin.org/headers', (err, response, body) => {
    if (err) {
      logger.warn('got an error');
      if (err.stack) {
        logger.error(err.stack);
      } else {
        logger.error(err);
      }
      process.exit(0);
    }
    if (response) {
      logger.debug('statusCode: %d', response.statusCode);
      logger.debug('headers: ', response.headers);
      logger.debug('body: ', body);
    }
    process.exit(0);
  });

```

## API

<a name="module_oniyi-http-client"></a>

### oniyi-http-client : [<code>HttpClient</code>](#HttpClient)
The default [HttpClient](#HttpClient) instance. Can be used without any further configuration

**Example** *(Use default instance)*  
```js
const httpClient = require('oniyi-http-client');
httpClient.get('http://httpbin.org/headers', {}, (err, response, body) => {
 if (err) {
   // handle error here
   return;
 }
 // do something with response and / or body
});
```
<a name="module_oniyi-http-client..create"></a>

#### oniyi-http-client~create([options]) ⇒ [<code>HttpClient</code>](#HttpClient)
Create a new [HttpClient](#HttpClient) instance.
Use this method to create your own client instances and mount plugins for
your specific request scenarios

**Kind**: inner method of [<code>oniyi-http-client</code>](#module_oniyi-http-client)  
**Returns**: [<code>HttpClient</code>](#HttpClient) - The newly created [HttpClient](#HttpClient) instance  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> | <code>{}</code> |  |
| [options.defaults] | <code>Object</code> |  | default request [options](https://github.com/request/request#requestoptions-callback) for the new instance.                                        Will be merged into options provided with each request via [_.defaultsDeep()](https://lodash.com/docs/4.17.4#defaultsDeep) |
| [options.requestPhases] | <code>Array.&lt;String&gt;</code> |  | complete list of phase names for the `onRequest` phaseList.                                        must include the names `initial` and `final` |
| [options.responsePhases] | <code>Array.&lt;String&gt;</code> |  | complete list of phase names for the `onResponse` phaseList.                                        must include the names `initial` and `final` |

**Example** *(with request defaults)*  
```js
const httpClient = require('oniyi-http-client');
const customClient = httpClient.create({
 defaults: {
   headers: {
     'custom': 'foo',
   },
   json: true,
 }
});

customClient.get('http://httpbin.org/headers', {}, (err, response, body) => {
 if (err) {
   // handle error here
   return;
 }
 console.log(body.headers.custom)
 // will log `foo`
});
```
**Example** *(with custom phases)*  
```js
const httpClient = require('oniyi-http-client');
const customClient = httpClient.create({
 requestPhases: ['early', 'initial', 'middle', 'final'],
 responsePhases: ['initial', 'middle', 'final', 'end'],
});
```

<a name="HttpClient"></a>

### HttpClient
**Kind**: global class  

* [HttpClient](#HttpClient)
    * [.#defaults()](#HttpClient+defaults) ⇒ <code>Object</code>
    * [.#jar([store])](#HttpClient+jar) ⇒ <code>Object</code>
    * [.#use(plugin, [options])](#HttpClient+use) ⇒ <code>Object</code>
    * [.#makeRequest(uri, [options], [callback])](#HttpClient+makeRequest) ⇒ [<code>RequestPromise</code>](#RequestPromise)
    * [.#get(uri, [options], [callback])](#HttpClient+get) ⇒ [<code>RequestPromise</code>](#RequestPromise)
    * [.#put(uri, [options], [callback])](#HttpClient+put) ⇒ [<code>RequestPromise</code>](#RequestPromise)
    * [.#post(uri, [options], [callback])](#HttpClient+post) ⇒ [<code>RequestPromise</code>](#RequestPromise)
    * [.#del(uri, [options], [callback])](#HttpClient+del) ⇒ [<code>RequestPromise</code>](#RequestPromise)
    * [.#head(uri, [options], [callback])](#HttpClient+head) ⇒ [<code>RequestPromise</code>](#RequestPromise)
    * [.#options(uri, [options], [callback])](#HttpClient+options) ⇒ [<code>RequestPromise</code>](#RequestPromise)

<a name="HttpClient+defaults"></a>

#### httpClient.#defaults() ⇒ <code>Object</code>
**Kind**: instance method of [<code>HttpClient</code>](#HttpClient)  
**Returns**: <code>Object</code> - a clone of this instance's defaults object  
<a name="HttpClient+jar"></a>

#### httpClient.#jar([store]) ⇒ <code>Object</code>
Create a new [CookieJar](https://github.com/salesforce/tough-cookie#cookiejar) with the provided
[Store](https://github.com/salesforce/tough-cookie#store) implementation.
Will use `request.jar(store)` [method](https://github.com/request/request#requestjar)
for creation when `store` is not async, `tough.CookieJar(store)` instead.

**Kind**: instance method of [<code>HttpClient</code>](#HttpClient)  
**Returns**: <code>Object</code> - [CookieJar](https://github.com/salesforce/tough-cookie#cookiejar)  

| Param | Type | Description |
| --- | --- | --- |
| [store] | <code>Object</code> | [tough-cookie Store](https://github.com/salesforce/tough-cookie#store) |

<a name="HttpClient+use"></a>

#### httpClient.#use(plugin, [options]) ⇒ <code>Object</code>
**Kind**: instance method of [<code>HttpClient</code>](#HttpClient)  
**Returns**: <code>Object</code> - a clone of this instance's defaults object  

| Param | Type |
| --- | --- |
| plugin | <code>Object</code> | 
| plugin.name | <code>String</code> | 
| [plugin.onRequest] | [<code>Array.&lt;PluginHook&gt;</code>](#PluginHook) | 
| [plugin.onResponse] | [<code>Array.&lt;PluginHook&gt;</code>](#PluginHook) | 
| [options] | <code>Object</code> | 

<a name="HttpClient+makeRequest"></a>

#### httpClient.#makeRequest(uri, [options], [callback]) ⇒ [<code>RequestPromise</code>](#RequestPromise)
make a http request with the provided arguments.
Request arguments are parsed and compiled to one `options` object, merged with this instance's `defaults`.
Then, the `onRequest` phaseList is onvoked with mentioned `options` as well as a [hookState](hookState).
After all [PluginHookHandler](#PluginHookHandler) have completed, the options from [OnRequestContext](#OnRequestContext) are used to invoke
[request](https://github.com/request/request). The result is used to resolve this method's returned [RequestPromise](#RequestPromise).
This is useful if you want to work with [request](https://github.com/request/request)'s' [Streaming](https://github.com/request/request#streaming) API.
After a response is received, a [OnResponseContext](#OnResponseContext) is created and passed through the `onResponse`
phaseList before finally your provided [RequestArgCallback](#RequestArgCallback) is invoked.

**Kind**: instance method of [<code>HttpClient</code>](#HttpClient)  

| Param | Type |
| --- | --- |
| uri | [<code>RequestArgUri</code>](#RequestArgUri) | 
| [options] | [<code>RequestArgOptions</code>](#RequestArgOptions) | 
| [callback] | [<code>RequestArgCallback</code>](#RequestArgCallback) | 

<a name="HttpClient+get"></a>

#### httpClient.#get(uri, [options], [callback]) ⇒ [<code>RequestPromise</code>](#RequestPromise)
Same as [#makeRequest](#HttpClient+makeRequest) but forces `options.method` to `GET`

**Kind**: instance method of [<code>HttpClient</code>](#HttpClient)  

| Param | Type |
| --- | --- |
| uri | [<code>RequestArgUri</code>](#RequestArgUri) | 
| [options] | [<code>RequestArgOptions</code>](#RequestArgOptions) | 
| [callback] | [<code>RequestArgCallback</code>](#RequestArgCallback) | 

<a name="HttpClient+put"></a>

#### httpClient.#put(uri, [options], [callback]) ⇒ [<code>RequestPromise</code>](#RequestPromise)
Same as [#makeRequest](#HttpClient+makeRequest) but forces `options.method` to `PUT`

**Kind**: instance method of [<code>HttpClient</code>](#HttpClient)  

| Param | Type |
| --- | --- |
| uri | [<code>RequestArgUri</code>](#RequestArgUri) | 
| [options] | [<code>RequestArgOptions</code>](#RequestArgOptions) | 
| [callback] | [<code>RequestArgCallback</code>](#RequestArgCallback) | 

<a name="HttpClient+post"></a>

#### httpClient.#post(uri, [options], [callback]) ⇒ [<code>RequestPromise</code>](#RequestPromise)
Same as [#makeRequest](#HttpClient+makeRequest) but forces `options.method` to `POST`

**Kind**: instance method of [<code>HttpClient</code>](#HttpClient)  

| Param | Type |
| --- | --- |
| uri | [<code>RequestArgUri</code>](#RequestArgUri) | 
| [options] | [<code>RequestArgOptions</code>](#RequestArgOptions) | 
| [callback] | [<code>RequestArgCallback</code>](#RequestArgCallback) | 

<a name="HttpClient+del"></a>

#### httpClient.#del(uri, [options], [callback]) ⇒ [<code>RequestPromise</code>](#RequestPromise)
Same as [#makeRequest](#HttpClient+makeRequest) but forces `options.method` to `DELETE`

**Kind**: instance method of [<code>HttpClient</code>](#HttpClient)  

| Param | Type |
| --- | --- |
| uri | [<code>RequestArgUri</code>](#RequestArgUri) | 
| [options] | [<code>RequestArgOptions</code>](#RequestArgOptions) | 
| [callback] | [<code>RequestArgCallback</code>](#RequestArgCallback) | 

<a name="HttpClient+head"></a>

#### httpClient.#head(uri, [options], [callback]) ⇒ [<code>RequestPromise</code>](#RequestPromise)
Same as [#makeRequest](#HttpClient+makeRequest) but forces `options.method` to `HEAD`

**Kind**: instance method of [<code>HttpClient</code>](#HttpClient)  

| Param | Type |
| --- | --- |
| uri | [<code>RequestArgUri</code>](#RequestArgUri) | 
| [options] | [<code>RequestArgOptions</code>](#RequestArgOptions) | 
| [callback] | [<code>RequestArgCallback</code>](#RequestArgCallback) | 

<a name="HttpClient+options"></a>

#### httpClient.#options(uri, [options], [callback]) ⇒ [<code>RequestPromise</code>](#RequestPromise)
Same as [#makeRequest](#HttpClient+makeRequest) but forces `options.method` to `OPTIONS`

**Kind**: instance method of [<code>HttpClient</code>](#HttpClient)  

| Param | Type |
| --- | --- |
| uri | [<code>RequestArgUri</code>](#RequestArgUri) | 
| [options] | [<code>RequestArgOptions</code>](#RequestArgOptions) | 
| [callback] | [<code>RequestArgCallback</code>](#RequestArgCallback) | 



## Type Definitions

<a name="PluginHook"></a>

### PluginHook : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| phaseName | <code>string</code> | Name of the phase that `handler` should be executed in.                                          value can include pseudo-phase postfix ':before' or ':after'                                          (e.g. 'initial:after' where 'initial' is the actual phaseName and                                          ':after' the pseudo phase) |
| handler | [<code>PluginHookHandler</code>](#PluginHookHandler) | handler function that is invoked when running through the according phase |


<a name="PluginHookHandler"></a>

### PluginHookHandler : <code>function</code>
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| context | <code>Object</code> | An object with the currently available request context.                              Hooks in the `onRequest` phaseList receive an [OnRequestContext](#OnRequestContext)                              while hooks that run in the `onResponse` phaseList receive an [OnResponseContext](#OnResponseContext) |
| next | <code>function</code> | callback function that must be invoked once the handler                              function completed it's operations |


<a name="Hookstate"></a>

### Hookstate : <code>Object</code>
A Hookstate instance is created for each request and shared across all phases
in the `onRequest` and `onResponse` phaseLists. [PluginHookHandler](#PluginHookHandler) can
modify this plain object at will (e.g. persist a timestamp in an `onRequest`
phase and read it again in another handler in an `onResponse` phase)

**Kind**: global typedef  

<a name="OnRequestContext"></a>

### OnRequestContext : <code>Object</code>
mutable context object that gets passed through all phases in the `onRequest` phaseList

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| hookState | [<code>Hookstate</code>](#Hookstate) |  |
| options | <code>Object</code> | [request options](https://github.com/request/request#requestoptions-callback) |


<a name="OnResponseContext"></a>

### OnResponseContext : <code>Object</code>
mutable context object that gets passed through all phases in the `onResponse` phaseList

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| hookState | [<code>Hookstate</code>](#Hookstate) | this is the [Hookstate](#Hookstate) instance from                                          this request's [OnRequestContext](#OnRequestContext) |
| options | <code>Object</code> | the options property frtom this request's [OnRequestContext](#OnRequestContext)                                          ([request options](https://github.com/request/request#requestoptions-callback)) |
| [requestError] | <code>Error</code> | an error when applicable (usually from                                          ([http.ClientRequest](http://nodejs.org/api/http.html#http_class_http_clientrequest)) object) |
| responseBody | <code>Object</code> | the response body (String or Buffer, or JSON object if the json option is supplied) |
| response | <code>Object</code> | an http.IncomingMessage                                          ([http.IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage))                                          object (Response object) |


<a name="RequestArgUri"></a>

### RequestArgUri : <code>String</code> \| <code>Object</code>
The first argument can be either a `url` or an
[`options`](https://github.com/request/request#requestoptions-callback)
object. The only required option is uri; all others are optional.

**Kind**: global typedef  

<a name="RequestArgOptions"></a>

### RequestArgOptions : <code>Object</code> \| <code>function</code>
The sesond argument can bei either
[`options`](https://github.com/request/request#requestoptions-callback)
object or `callback` function.

**Kind**: global typedef  

<a name="RequestArgCallback"></a>

### RequestArgCallback : <code>function</code>
Callback function, Invoked at the end of response receiving (or in case of error,
when the error is generated). Receives three arguments (`err`, `response`, `body`)
that are also available in [OnResponseContext](#OnResponseContext)

**Kind**: global typedef  

<a name="RequestPromise"></a>

### RequestPromise : <code>Promise</code>
A Promise that resolves to the return value for `request()` after all
[PluginHookHandler](#PluginHookHandler) in the `onRequest` phaseList have completed.
If any of the [PluginHookHandler](#PluginHookHandler)s produces an error,
Promise is rejected with that error object.

**Kind**: global typedef  



## License

MIT © [Benjamin Kroeger]()
