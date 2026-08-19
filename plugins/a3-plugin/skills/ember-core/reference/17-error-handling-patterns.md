## 17. Error Handling Patterns

### 17.1 Route Error Action

The `error` action on a route fires when any hook rejects. It bubbles upward.

```typescript
export default class ClientRoute extends Route {
  @action
  error(error: Error, transition: Transition): boolean | void {
    if (error instanceof NotFoundError) {
      this.router.transitionTo('not-found');
      return false; // Stop bubbling
    }

    if (error instanceof ForbiddenError) {
      this.flashMessages.danger('You do not have permission to view this resource.');
      this.router.transitionTo('authenticated.dashboard');
      return false;
    }

    // Let unknown errors bubble to parent route / application error handler
    return true;
  }
}
```

### 17.2 Application-Level Error Handler

```typescript
export default class ApplicationRoute extends Route {
  @service declare session: SessionService;
  @service declare router: RouterService;
  @service('flash-messages') declare flashMessages: FlashMessageService;

  @action
  error(error: Error, transition: Transition): boolean {
    // Handle 401 — redirect to login
    if (isUnauthorizedError(error)) {
      this.session.invalidate();
      this.router.transitionTo('login');
      return false;
    }

    // Handle 403
    if (isForbiddenError(error)) {
      this.flashMessages.danger('Access denied.');
      this.router.transitionTo('authenticated.dashboard');
      return false;
    }

    // Handle 404
    if (isNotFoundError(error)) {
      this.router.transitionTo('not-found');
      return false;
    }

    // Handle network errors
    if (isNetworkError(error)) {
      this.flashMessages.danger('Network error. Please check your connection.');
      return false;
    }

    // Log unknown errors and show generic error substate
    console.error('Unhandled route error:', error);
    return true; // Show the error substate template
  }
}
```

### 17.3 Error Bubbling Order

For an error in `authenticated.clients.client`:

1. `authenticated.clients.client` route `error` action
2. `authenticated.clients` route `error` action
3. `authenticated` route `error` action
4. `application` route `error` action
5. Default error substate template

If any handler returns `false`, bubbling stops. If all return `true` (or none
handle it), the error substate template is shown.

### 17.4 Error Recovery in Templates

The error substate template receives the error as `@model`:

```gts
// app/templates/authenticated/error.gts
<template>
  <div class="container py-5">
    <div class="alert alert-danger">
      <h4>Something went wrong</h4>
      <p>{{@model.message}}</p>
      {{#if @model.stack}}
        <details>
          <summary>Technical details</summary>
          <pre>{{@model.stack}}</pre>
        </details>
      {{/if}}
      <button
        type="button"
        class="btn btn-primary mt-3"
        {{on "click" this.retry}}
      >
        Try Again
      </button>
    </div>
  </div>
</template>
```

---
