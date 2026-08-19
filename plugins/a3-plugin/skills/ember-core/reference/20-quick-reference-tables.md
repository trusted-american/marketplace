## 20. Quick Reference Tables

### 20.1 Import Map

| Import | Package | Purpose |
|---|---|---|
| `Route` | `@ember/routing/route` | Route class |
| `RouterService` | `@ember/routing/router-service` | Router service type |
| `Controller` | `@ember/controller` | Controller class |
| `Service` | `@ember/service` | Service base class |
| `{ service }` | `@ember/service` | Service injection decorator |
| `Component` | `@glimmer/component` | Glimmer component class |
| `{ tracked }` | `@glimmer/tracking` | Tracked property decorator |
| `{ action }` | `@ember/object` | Action decorator |
| `{ on }` | `@ember/modifier` | Event listener modifier |
| `{ fn }` | `@ember/helper` | Partial application helper |
| `{ hash }` | `@ember/helper` | POJO creation helper |
| `{ array }` | `@ember/helper` | Array creation helper |
| `{ get }` | `@ember/helper` | Dynamic property access helper |
| `{ concat }` | `@ember/helper` | String concatenation helper |
| `{ LinkTo }` | `@ember/routing` | Link component |
| `{ modifier }` | `ember-modifier` | Custom modifier factory |
| `{ helper }` | `@ember/component/helper` | Custom helper factory |
| `{ getOwner, setOwner }` | `@ember/owner` | DI owner access |
| `{ registerDestructor }` | `@ember/destroyable` | Cleanup registration |
| `{ schedule, later, ... }` | `@ember/runloop` | Run loop utilities |
| `{ get, set, computed }` | `@ember/object` | Legacy object utilities |

### 20.2 Route Hook Cheat Sheet

| Hook | Receives | Returns | Purpose |
|---|---|---|---|
| `beforeModel` | `transition` | `void \| Promise` | Auth, redirects (no model needed) |
| `model` | `params, transition` | `any \| Promise` | Load data |
| `afterModel` | `model, transition` | `void \| Promise` | Post-load redirects, validation |
| `setupController` | `controller, model, transition` | `void` | Pass extra data to controller |
| `resetController` | `controller, isExiting, transition` | `void` | Clean up state on exit |
| `redirect` | `model, transition` | `void` | Legacy redirect hook |
| `serialize` | `model, params` | `object` | Model-to-URL params |
| `buildRouteInfoMetadata` | *(none)* | `any` | Attach metadata to RouteInfo |

### 20.3 Router Service Cheat Sheet

| Method/Property | Purpose |
|---|---|
| `transitionTo(route, ...models, options)` | Navigate (pushState) |
| `replaceWith(route, ...models, options)` | Navigate (replaceState) |
| `urlFor(route, ...models, options)` | Generate URL string |
| `recognize(url)` | Parse URL to RouteInfo |
| `recognizeAndLoad(url)` | Parse URL and load model |
| `isActive(route, ...models, options)` | Check if route is active |
| `currentURL` | Current full URL |
| `currentRouteName` | Current route dot-name |
| `currentRoute` | Current RouteInfo |
| `on('routeWillChange', fn)` | Before transition |
| `on('routeDidChange', fn)` | After transition |

---
