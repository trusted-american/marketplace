---
name: intercom
description: Intercom Messenger SDK reference — @intercom/messenger-js-sdk for customer support chat widget in A3
version: 0.1.0
---

# Intercom Messenger SDK Reference

## Package: @intercom/messenger-js-sdk

The official Intercom Messenger JavaScript SDK for embedding the customer support chat widget. A3 uses Intercom for in-app support, onboarding messages, and product announcements.

### Installation

```bash
pnpm add @intercom/messenger-js-sdk
```

### Import

```typescript
import Intercom from '@intercom/messenger-js-sdk';
```

## Initialization

### Basic Init

```typescript
Intercom({
  app_id: 'YOUR_APP_ID',
});
```

### With User Identification (Logged-in Users)

```typescript
Intercom({
  app_id: 'YOUR_APP_ID',
  user_id: 'user_abc123',          // Your internal user ID
  email: 'john@example.com',
  name: 'John Doe',
  created_at: 1609459200,          // Unix timestamp of user creation
  user_hash: 'hmac_sha256_hash',   // Identity verification hash (required in production)
});
```

### Identity Verification

In production, always use identity verification to prevent impersonation. The HMAC is computed server-side:

```typescript
// Backend (Cloud Function)
import crypto from 'crypto';

function generateIntercomHash(userId: string): string {
  return crypto
    .createHmac('sha256', process.env.INTERCOM_SECRET_KEY!)
    .update(userId)
    .digest('hex');
}

// Frontend — pass the hash from your auth service
Intercom({
  app_id: 'YOUR_APP_ID',
  user_id: userId,
  user_hash: hashFromBackend,
});
```

## Core API Methods

### Intercom() — Boot / Update

The `Intercom()` function serves as both boot and update. Call it on page load with user data.

```typescript
// Boot the messenger
Intercom({
  app_id: 'YOUR_APP_ID',
  user_id: user.id,
  email: user.email,
  name: user.displayName,
});
```

### update() — Update User Data

Call `update()` when user data changes or on route transitions (for SPA page tracking):

```typescript
import { update } from '@intercom/messenger-js-sdk';

// Update user attributes
update({
  email: 'newemail@example.com',
  name: 'Updated Name',
  company: {
    company_id: 'company_abc',
    name: 'Acme Corp',
    plan: 'enterprise',
  },
});

// Ping on route change (no arguments) — logs a page view
update();
```

### show() — Open the Messenger

```typescript
import { show } from '@intercom/messenger-js-sdk';

show();
```

### hide() — Close the Messenger

```typescript
import { hide } from '@intercom/messenger-js-sdk';

hide();
```

### showNewMessage() — Open with Pre-filled Message

```typescript
import { showNewMessage } from '@intercom/messenger-js-sdk';

// Open composer with pre-filled text
showNewMessage('I need help with my enrollment form');

// Open empty composer
showNewMessage();
```

### showArticle() — Open a Help Center Article

```typescript
import { showArticle } from '@intercom/messenger-js-sdk';

showArticle(12345); // Intercom article ID
```

### showSpace() — Open a Specific Messenger Space

```typescript
import { showSpace } from '@intercom/messenger-js-sdk';

showSpace('home');     // Home screen
showSpace('messages'); // Conversation list
showSpace('help');     // Help center
showSpace('news');     // News/announcements
showSpace('tasks');    // Checklist tasks
```

### getVisitorId() — Get Anonymous Visitor ID

```typescript
import { getVisitorId } from '@intercom/messenger-js-sdk';

const visitorId = getVisitorId();
// Useful for tracking anonymous users before login
```

### startTour() — Trigger a Product Tour

```typescript
import { startTour } from '@intercom/messenger-js-sdk';

startTour(67890); // Intercom tour ID
```

### shutdown() — Disconnect and Clear

```typescript
import { shutdown } from '@intercom/messenger-js-sdk';

// Call on logout — clears cookies and disconnects
shutdown();
```

### startSurvey() — Trigger a Survey

```typescript
import { startSurvey } from '@intercom/messenger-js-sdk';

startSurvey(11111); // Intercom survey ID
```

### trackEvent() — Log Custom Events

```typescript
import { trackEvent } from '@intercom/messenger-js-sdk';

trackEvent('completed-enrollment', {
  plan: 'premium',
  amount: 1500,
  county: 'Los Angeles',
});

trackEvent('viewed-training-video', {
  videoId: 'abc123',
  duration: 300,
});
```

## Event Callbacks

### onShow / onHide

```typescript
import { onShow, onHide } from '@intercom/messenger-js-sdk';

onShow(() => {
  console.log('Messenger opened');
  // Pause background activity, track analytics
});

onHide(() => {
  console.log('Messenger closed');
});
```

### onUnreadCountChange

```typescript
import { onUnreadCountChange } from '@intercom/messenger-js-sdk';

onUnreadCountChange((unreadCount: number) => {
  // Update your custom notification badge
  updateBadge(unreadCount);
});
```

### onUserEmailSupplied

```typescript
import { onUserEmailSupplied } from '@intercom/messenger-js-sdk';

onUserEmailSupplied(() => {
  // Visitor provided their email in the messenger
  console.log('User email captured');
});
```

## Custom User Attributes

Send custom data attributes to Intercom for segmentation and messaging:

```typescript
Intercom({
  app_id: 'YOUR_APP_ID',
  user_id: user.id,
  email: user.email,
  name: user.displayName,

  // Standard attributes
  phone: '+15551234567',
  avatar: { type: 'avatar', image_url: 'https://...' },
  language_override: 'en',

  // Custom attributes (must be created in Intercom dashboard first)
  role: 'agent',
  organization_name: 'Acme Insurance',
  enrollment_count: 42,
  last_enrollment_date: 1700000000,
  is_admin: true,
  active_counties: 'Los Angeles, San Diego, Orange',
});
```

### Company Data

```typescript
Intercom({
  app_id: 'YOUR_APP_ID',
  user_id: user.id,
  company: {
    company_id: 'org_abc123',
    name: 'Acme Insurance Group',
    plan: 'enterprise',
    monthly_spend: 5000,
    created_at: 1609459200,

    // Custom company attributes
    industry: 'Insurance',
    agent_count: 150,
    state: 'California',
  },
});
```

## Ember Service Integration Pattern

A3 wraps Intercom in an Ember service for centralized management:

```typescript
// app/services/intercom.ts
import Service, { inject as service } from '@ember/service';
import IntercomSDK, {
  update,
  show,
  hide,
  shutdown,
  showNewMessage,
  trackEvent,
  onUnreadCountChange,
} from '@intercom/messenger-js-sdk';
import type SessionService from './session';
import { tracked } from '@glimmer/tracking';

export default class IntercomService extends Service {
  @service declare session: SessionService;
  @tracked unreadCount = 0;

  private isBooted = false;

  boot() {
    if (this.isBooted) return;

    const user = this.session.currentUser;
    if (!user) return;

    IntercomSDK({
      app_id: this.appId,
      user_id: user.id,
      email: user.email,
      name: user.displayName,
      user_hash: user.intercomHash,
      role: user.role,
      organization_name: user.orgName,
    });

    onUnreadCountChange((count) => {
      this.unreadCount = count;
    });

    this.isBooted = true;
  }

  get appId(): string {
    // From environment config
    return this.config.intercom.appId;
  }

  updatePage() {
    if (!this.isBooted) return;
    update();
  }

  openMessenger() {
    show();
  }

  closeMessenger() {
    hide();
  }

  openWithMessage(message: string) {
    showNewMessage(message);
  }

  track(eventName: string, metadata?: Record<string, unknown>) {
    if (!this.isBooted) return;
    trackEvent(eventName, metadata);
  }

  teardown() {
    if (!this.isBooted) return;
    shutdown();
    this.isBooted = false;
    this.unreadCount = 0;
  }
}
```

### Route Integration for Page Tracking

```typescript
// app/routes/application.ts
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import type RouterService from '@ember/routing/router-service';
import type IntercomService from 'a3/services/intercom';

export default class ApplicationRoute extends Route {
  @service declare router: RouterService;
  @service declare intercom: IntercomService;

  afterModel() {
    this.intercom.boot();

    // Track page views on route transitions
    this.router.on('routeDidChange', () => {
      this.intercom.updatePage();
    });
  }
}
```

### Logout Cleanup

```typescript
// In your auth/session service
async logout() {
  this.intercom.teardown();
  await this.auth.signOut();
}
```

## Hiding/Showing the Launcher

Control launcher visibility per route (e.g., hide during enrollment flow):

```typescript
// Hide the default launcher button
update({ hide_default_launcher: true });

// Show it again
update({ hide_default_launcher: false });
```

## Intercom CSS Customization

The launcher position and z-index can be configured:

```typescript
Intercom({
  app_id: 'YOUR_APP_ID',
  alignment: 'right',              // 'left' or 'right'
  horizontal_padding: 20,          // px from edge
  vertical_padding: 20,            // px from bottom
});
```

For deeper CSS overrides, target the Intercom iframe container:

```css
/* Adjust z-index to avoid conflicts with modals */
.intercom-lightweight-app {
  z-index: 999 !important;
}
```

## Common Pitfalls

1. **Single Page App routing:** Always call `update()` on route transitions. Without it, Intercom does not track page views in SPAs.
2. **Identity verification:** Without `user_hash`, anyone can impersonate users by passing a different `user_id`. Always enable identity verification in production.
3. **Shutdown on logout:** Failing to call `shutdown()` on logout leaks the previous user's session to the next logged-in user.
4. **Custom attributes:** Custom attributes must be created in the Intercom dashboard before they appear in the UI. Sending unknown attributes is silently accepted but not visible until configured.
5. **Multiple boots:** Calling `Intercom()` multiple times without `shutdown()` first can cause duplicate messengers or stale state. Track boot state and guard against re-initialization.
6. **Rate limits:** `trackEvent` has rate limits (120 events per user per hour). Batch high-frequency events or throttle calls.
