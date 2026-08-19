---
name: mailgun
description: Mailgun email service reference — send-email utility + domains endpoint + frontend mailgun.js. Transactional email, templates, domain management
version: 0.1.0
---


# Mailgun Email Service Reference

A3 integrates Mailgun for transactional email delivery, template-based emails, domain management, and event tracking. This skill covers the send-email utility, domains endpoint, frontend mailgun.js integration, Firestore-triggered emails, batch sending, and event/webhook handling.

---

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-send-email-utility-utils-send-email-ts.md` | Send Email Utility — `utils/send-email.ts` |
| `reference/03-firestore-triggered-emails.md` | Firestore-Triggered Emails |
| `reference/04-domain-management-domains-ts.md` | Domain Management — `domains.ts` |
| `reference/05-event-tracking-webhooks-events-ts.md` | Event Tracking / Webhooks — `events.ts` |

## Architecture Overview

### File Map

| File | Purpose |
|---|---|
| `functions/src/utils/send-email.ts` | Core email sending utility using mailgun.js |
| `functions/src/mailgun/domains.ts` | Domain management endpoint (list, verify, add) |
| `functions/src/mailgun/events.ts` | Mailgun webhook event handler for delivery/bounce/open/click tracking |
| `app/services/mailgun.js` | Frontend Ember service for email composition and send requests |

### Mailgun Client Initialization

```typescript
// functions/src/utils/send-email.ts
import Mailgun from 'mailgun.js';
import formData from 'form-data';

const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY!,
  url: 'https://api.mailgun.net', // or 'https://api.eu.mailgun.net' for EU
});

export default mg;
```

### Key Points

- **mailgun.js**: A3 uses the official `mailgun.js` npm package (not the deprecated `mailgun-js`).
- **form-data**: Required for multipart form encoding used by the Mailgun API.
- **API key**: Stored in Cloud Functions environment config as `MAILGUN_API_KEY`. Format: `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.
- **Region**: US region uses `api.mailgun.net`, EU region uses `api.eu.mailgun.net`. A3 defaults to US.
- **Domain**: Each organization can have its own sending domain, or use A3's default domain.

---
## Batch Sending

For sending to multiple recipients (e.g., marketing, notifications):

```typescript
// Batch send with recipient variables
export async function sendBatchEmail(options: {
  recipients: Array<{ email: string; variables: Record<string, string> }>;
  subject: string;
  template: string;
  from?: string;
  domain?: string;
  tags?: string[];
}) {
  const domain = options.domain || process.env.MAILGUN_DOMAIN!;
  const from = options.from || `A3 <noreply@${domain}>`;

  const recipientVariables: Record<string, Record<string, string>> = {};
  const toList: string[] = [];

  for (const recipient of options.recipients) {
    toList.push(recipient.email);
    recipientVariables[recipient.email] = recipient.variables;
  }

  const messageData = {
    from,
    to: toList.join(','),
    subject: options.subject,
    template: options.template,
    'recipient-variables': JSON.stringify(recipientVariables),
    'o:tag': options.tags || [],
  };

  // Mailgun supports up to 1000 recipients per batch
  const result = await mg.messages.create(domain, messageData);
  return result;
}
```

### Batch Limits

- **Max recipients per API call**: 1,000
- **For larger lists**: Split into chunks of 1,000 and send multiple API calls.
- **Rate limiting**: Mailgun may rate-limit at high volume. Use `o:deliverytime` to schedule sends.

```typescript
// Scheduled send — deliver in 2 hours
messageData['o:deliverytime'] = new Date(Date.now() + 2 * 60 * 60 * 1000).toUTCString();
```

---
## Frontend Mailgun Service — `app/services/mailgun.js`

The frontend service does not call Mailgun directly. It sends email requests to the A3 backend.

```javascript
// app/services/mailgun.js
import Service, { inject as service } from '@ember/service';

export default class MailgunService extends Service {
  @service api;

  async sendEmail({ to, subject, html, text, template, variables, attachments }) {
    return this.api.request('POST', '/mailgun/send', {
      to,
      subject,
      html,
      text,
      template,
      variables,
      attachments,
    });
  }

  async getEmailEvents(messageId) {
    return this.api.request('GET', `/mailgun/events/${messageId}`);
  }

  async getDomains() {
    return this.api.request('GET', '/mailgun/domains');
  }

  async addDomain(domain) {
    return this.api.request('POST', '/mailgun/domains', { domain });
  }

  async verifyDomain(domain) {
    return this.api.request('POST', `/mailgun/domains/${domain}/verify`);
  }
}
```

---
## Suppression Management

A3 checks the suppression list before sending to prevent bounces and complaints:

```typescript
async function isEmailSuppressed(email: string): Promise<boolean> {
  const doc = await admin.firestore()
    .collection('email_suppressions')
    .doc(email)
    .get();

  return doc.exists;
}

// Before sending
if (await isEmailSuppressed(recipientEmail)) {
  console.log(`Skipping suppressed email: ${recipientEmail}`);
  return;
}
```

### Mailgun Suppression Lists

Mailgun maintains its own suppression lists (bounces, complaints, unsubscribes). A3 also queries these:

```typescript
// Check Mailgun bounces
const bounces = await mg.suppressions.list(domain, 'bounces', { address: email });

// Check Mailgun complaints
const complaints = await mg.suppressions.list(domain, 'complaints', { address: email });

// Check Mailgun unsubscribes
const unsubscribes = await mg.suppressions.list(domain, 'unsubscribes', { address: email });
```

---
## Error Handling

```typescript
try {
  const result = await mg.messages.create(domain, messageData);
  return result;
} catch (err: any) {
  if (err.status === 401) {
    console.error('Mailgun API key invalid');
    throw new Error('Email service configuration error');
  }
  if (err.status === 402) {
    console.error('Mailgun account has insufficient funds or plan limits');
    throw new Error('Email service quota exceeded');
  }
  if (err.status === 404) {
    console.error('Mailgun domain not found:', domain);
    throw new Error('Email domain not configured');
  }
  if (err.status === 429) {
    console.error('Mailgun rate limited');
    throw new Error('Email rate limit reached. Try again later.');
  }
  console.error('Mailgun error:', err.message);
  throw new Error('Failed to send email');
}
```

---
## Environment Variables Required

| Variable | Description |
|---|---|
| `MAILGUN_API_KEY` | API key: `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `MAILGUN_DOMAIN` | Default sending domain: `mail.yourdomain.com` |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | Webhook signing key for signature verification |

---
## Common Patterns and Best Practices

1. **Always check suppressions**: Before sending, check the suppression list. Sending to bounced/complained addresses damages domain reputation.
2. **Use templates**: Prefer Mailgun stored templates over inline HTML for consistent branding and easier updates.
3. **Tag every email**: Use `o:tag` for categorization (e.g., `transactional`, `invoice`, `notification`). Enables filtering in Mailgun analytics.
4. **Custom variables for tracking**: Use `v:` prefixed variables to attach metadata (e.g., `v:firebaseUid`, `v:dealId`). These are returned in webhook events.
5. **Handle bounces promptly**: Permanent bounces should immediately suppress the address. Continued sending to bounced addresses can get your domain blacklisted.
6. **Test with sandbox domain**: Mailgun provides a sandbox domain for development. Use it to avoid sending real emails during testing.
7. **Unsubscribe link**: Always include an unsubscribe link in marketing emails. Mailgun can auto-insert one via `%unsubscribe_url%` in templates.
8. **SPF/DKIM/DMARC**: Ensure DNS records are properly configured. Unverified domains have lower deliverability.
