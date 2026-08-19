## WarpDrive-Specific APIs

WarpDrive is the next-generation architecture layered on top of Ember Data. It introduces the RequestManager pattern, SchemaRecord, and reactive primitives.

### RequestManager

The central request coordination layer. Replaces the adapter/serializer pattern with a pipeline of handlers.

```typescript
import RequestManager from '@warp-drive/core/request-manager';
import { CacheHandler } from '@warp-drive/core';

const manager = new RequestManager();
manager.use([MyAuthHandler, MyFetchHandler]);
manager.useCache(CacheHandler);
```

Requests flow through handlers in order. Each handler can modify, short-circuit, or pass through the request.

### Handler Pattern

A handler is an object with a `request` method:

```typescript
interface Handler {
  request<T>(
    context: RequestContext,
    next: (request: RequestInfo) => Promise<T>
  ): Promise<T>;
}
```

Example custom handler:

```typescript
const AuthHandler = {
  async request(context, next) {
    // Add auth header to every request
    context.request.headers.set('Authorization', `Bearer ${getToken()}`);
    return next(context.request);
  },
};

const LoggingHandler = {
  async request(context, next) {
    console.log('Request:', context.request.url);
    const result = await next(context.request);
    console.log('Response:', result);
    return result;
  },
};
```

### CacheHandler

A built-in handler that intercepts requests and checks the store's cache before making a network call. If the cache has a valid entry, it returns it immediately.

```typescript
import { CacheHandler } from '@warp-drive/core';

manager.useCache(CacheHandler);
```

### JSONAPICache

The default cache implementation. Stores records in JSON:API normalized format.

```typescript
import { JSONAPICache } from '@warp-drive/json-api';

class MyStore extends Store {
  createCache(storeWrapper) {
    return new JSONAPICache(storeWrapper);
  }
}
```

### SchemaRecord

WarpDrive's next-gen record type that replaces `@ember-data/model`. Records are defined via schemas rather than class decorators. Not yet fully adopted in A3 but available for new patterns.

```typescript
import { SchemaRecord } from '@warp-drive/core';

const ClientSchema = {
  type: 'client',
  fields: [
    { name: 'firstName', kind: 'attribute', type: 'string' },
    { name: 'lastName', kind: 'attribute', type: 'string' },
    { name: 'enrollments', kind: 'hasMany', type: 'enrollment', options: { inverse: 'client', async: true } },
  ],
};
```

### Reactive Document

WarpDrive's `Document` is a reactive wrapper around a cache entry. It auto-updates when the cache changes.

```typescript
const doc = store.request({ url: '/api/clients/123' });
// doc.data — the record
// doc.content — the raw response
// Accessing doc.data in a tracked context auto-subscribes to changes
```

### @warp-drive/ember `<Request>` Component

A component that manages request lifecycle in templates:

```handlebars
<Request @request={{this.fetchClient}}>
  <:loading>
    <Spinner />
  </:loading>

  <:error as |error|>
    <ErrorDisplay @error={{error}} />
  </:error>

  <:content as |data|>
    <ClientCard @client={{data}} />
  </:content>
</Request>
```

```typescript
// In the component class
get fetchClient() {
  return this.store.request({
    url: `/api/clients/${this.args.clientId}`,
    method: 'GET',
  });
}
```

### RequestState

Tracks the state of a request:

```typescript
interface RequestState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: T | null;
  error: Error | null;
}
```

---
