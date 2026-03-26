---
name: auth-permissions
description: A3 authentication and permission system — Firebase Auth, ember-simple-auth, ember-can abilities, role-based access, and the full auth flow
version: 0.1.0
---

# A3 Auth & Permissions Reference

## Authentication Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Identity Provider | Firebase Authentication | User credentials, MFA, tokens |
| Session Management | ember-simple-auth | Frontend session lifecycle |
| Session Service | app/services/session.ts | Firebase-specific auth logic |
| User Data | app/services/current-user.ts | Loaded user record & permissions |
| Authorization | ember-can | Frontend permission checks |
| Backend Auth | Firestore Security Rules | Document-level access control |
| API Auth | Cloud Functions | Token verification for HTTP endpoints |

## Auth Flow

### Login
```
1. User enters email/password on /login
2. Component calls session.authenticate('authenticator:firebase', email, password)
3. Firebase Auth validates credentials
4. If MFA enabled: second factor challenge
5. Firebase returns JWT token
6. ember-simple-auth stores token in session
7. current-user service loads user record from Firestore
8. Router transitions to /a3 (dashboard)
```

### Session Persistence
```
1. On app boot: ember-simple-auth checks session store
2. If valid session exists: restore token
3. Verify token hasn't expired
4. Load current user data
5. If expired: redirect to /login
```

### Token Usage
```
1. Every Firestore read/write includes the auth token automatically
2. Cloud Function HTTPS calls include Bearer token in Authorization header
3. Firestore rules access token via request.auth
4. Cloud Functions verify via getAuth().verifyIdToken(token)
```

## ember-simple-auth Integration

### Session Service
```typescript
// app/services/session.ts
import SessionService from 'ember-simple-auth/services/session';
import { service } from '@ember/service';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';

export default class Session extends SessionService {
  @service declare currentUser: CurrentUserService;

  async handleAuthentication() {
    await this.currentUser.load();
    this.router.transitionTo('authenticated');
  }

  async handleInvalidation() {
    await signOut(getAuth());
    window.location.replace('/login');
  }
}
```

### Session Store
```typescript
// app/session-stores/application.ts
// Stores the session token (localStorage or cookie)
```

### Protected Routes
```typescript
// app/routes/authenticated.ts
import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;

  async beforeModel(transition: Transition) {
    // Redirect to login if not authenticated
    this.session.requireAuthentication(transition, 'login');
  }
}

// app/routes/admin.ts
export default class AdminRoute extends Route {
  @service declare session: SessionService;
  @service declare currentUser: CurrentUserService;

  async beforeModel(transition: Transition) {
    this.session.requireAuthentication(transition, 'login');

    // Additional admin check
    if (!this.currentUser.user?.isAdmin) {
      this.router.transitionTo('authenticated');
    }
  }
}
```

## Current User Service

```typescript
// app/services/current-user.ts
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class CurrentUserService extends Service {
  @service declare store: StoreService;
  @service declare session: SessionService;

  @tracked user: User | null = null;

  async load() {
    const uid = this.session.data.authenticated.uid;
    this.user = await this.store.findRecord('user', uid);
  }

  get isAdmin(): boolean {
    return this.user?.isAdmin ?? false;
  }

  get isSuper(): boolean {
    return this.user?.isSuper ?? false;
  }

  get permissions(): string[] {
    return this.user?.permissions ?? [];
  }
}
```

## ember-can (Authorization)

### Ability Definition
```typescript
// app/abilities/enrollment.ts
import BaseAbility from './-ability';

export default class EnrollmentAbility extends BaseAbility {
  get canCreate() {
    return this.isAdmin || this.hasPermission('enrollments.create');
  }

  get canRead() {
    return this.isAuthenticated;
  }

  get canUpdate() {
    if (this.isAdmin) return true;
    if (!this.model) return false;
    return this.model.createdBy === this.currentUser.user?.id;
  }

  get canDelete() {
    return this.isSuper;
  }

  get canExport() {
    return this.isAdmin || this.hasPermission('enrollments.export');
  }
}
```

### Using in Templates
```gts
import { can } from 'ember-can';

<template>
  {{#if (can "create enrollment")}}
    <LinkTo @route="authenticated.enrollments.new" class="btn btn-primary">
      New Enrollment
    </LinkTo>
  {{/if}}

  {{#if (can "update enrollment" model=@enrollment)}}
    <button {{on "click" this.edit}}>Edit</button>
  {{/if}}

  {{#if (can "delete enrollment" model=@enrollment)}}
    <button {{on "click" this.delete}} class="btn btn-danger">Delete</button>
  {{/if}}
</template>
```

### Using in JavaScript
```typescript
import { service } from '@ember/service';

export default class MyComponent extends Component {
  @service declare abilities: AbilitiesService;

  get canEdit() {
    return this.abilities.can('update enrollment', this.args.enrollment);
  }
}
```

## Role Hierarchy

| Role | Capabilities |
|------|-------------|
| Super Admin | Everything — system-level operations, user management, destructive actions |
| Admin | CRUD on most resources, reporting, settings, user invites |
| Agent | Read most resources, CRUD on own data, submit enrollments |
| Limited Agent | Read-only on approved resources |

## Permission Keys (A3 Pattern)
Permissions are stored as an array of strings on the user document:
```
[
  "clients.create",
  "clients.update",
  "enrollments.create",
  "enrollments.update",
  "enrollments.export",
  "statements.read",
  "reports.view"
]
```

## Further Investigation

- **ember-simple-auth**: https://ember-simple-auth.com/
- **ember-can**: https://github.com/minutebase/ember-can
- **Firebase Auth**: https://firebase.google.com/docs/auth
- **Firestore Security**: https://firebase.google.com/docs/firestore/security/get-started
