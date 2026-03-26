---
name: mailgun
description: Mailgun email service reference — send-email utility + domains endpoint + frontend mailgun.js. Transactional email, templates, domain management
version: 0.1.0
---

# Mailgun Email Service Reference

A3 integrates Mailgun for transactional email delivery, template-based emails, domain management, and event tracking. This skill covers the send-email utility, domains endpoint, frontend mailgun.js integration, Firestore-triggered emails, batch sending, and event/webhook handling.

---

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

## Send Email Utility — `utils/send-email.ts`

### Basic Send

```typescript
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{ filename: string; data: Buffer; contentType: string }>;
  tags?: string[];
  metadata?: Record<string, string>;
  domain?: string;
}) {
  const domain = options.domain || process.env.MAILGUN_DOMAIN!;
  const from = options.from || `A3 <noreply@${domain}>`;

  const messageData: any = {
    from,
    to: Array.isArray(options.to) ? options.to.join(',') : options.to,
    subject: options.subject,
  };

  if (options.text) messageData.text = options.text;
  if (options.html) messageData.html = options.html;
  if (options.replyTo) messageData['h:Reply-To'] = options.replyTo;
  if (options.cc) messageData.cc = Array.isArray(options.cc) ? options.cc.join(',') : options.cc;
  if (options.bcc) messageData.bcc = Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc;
  if (options.tags) messageData['o:tag'] = options.tags;
  if (options.metadata) {
    for (const [key, value] of Object.entries(options.metadata)) {
      messageData[`v:${key}`] = value;
    }
  }

  // Handle attachments
  if (options.attachments?.length) {
    messageData.attachment = options.attachments.map((att) => ({
      filename: att.filename,
      data: att.data,
      contentType: att.contentType,
    }));
  }

  const result = await mg.messages.create(domain, messageData);
  return result;
  // result: { id: '<message-id@domain>', message: 'Queued. Thank you.' }
}
```

### Template-Based Send

Mailgun supports stored templates. A3 uses these for consistent branding:

```typescript
export async function sendTemplateEmail(options: {
  to: string | string[];
  template: string;
  variables: Record<string, string>;
  subject: string;
  from?: string;
  domain?: string;
  tags?: string[];
}) {
  const domain = options.domain || process.env.MAILGUN_DOMAIN!;
  const from = options.from || `A3 <noreply@${domain}>`;

  const messageData: any = {
    from,
    to: Array.isArray(options.to) ? options.to.join(',') : options.to,
    subject: options.subject,
    template: options.template,
    'h:X-Mailgun-Variables': JSON.stringify(options.variables),
  };

  if (options.tags) messageData['o:tag'] = options.tags;

  const result = await mg.messages.create(domain, messageData);
  return result;
}
```

### Template Variables

Templates use Handlebars syntax. A3 defines these standard templates:

| Template Name | Variables | Purpose |
|---|---|---|
| `welcome` | `{{firstName}}`, `{{loginUrl}}` | New user welcome email |
| `password-reset` | `{{firstName}}`, `{{resetUrl}}`, `{{expiryTime}}` | Password reset link |
| `invoice-created` | `{{clientName}}`, `{{invoiceNumber}}`, `{{amount}}`, `{{dueDate}}`, `{{viewUrl}}` | Invoice notification |
| `deal-assigned` | `{{userName}}`, `{{dealTitle}}`, `{{clientName}}`, `{{dealUrl}}` | Deal assignment notification |
| `document-signed` | `{{recipientName}}`, `{{documentName}}`, `{{downloadUrl}}` | PandaDoc completion notice |
| `payment-received` | `{{clientName}}`, `{{amount}}`, `{{invoiceNumber}}` | Payment confirmation |
| `subscription-expiring` | `{{userName}}`, `{{planName}}`, `{{expiryDate}}`, `{{renewUrl}}` | Subscription renewal reminder |

### Usage Example

```typescript
await sendTemplateEmail({
  to: client.email,
  template: 'invoice-created',
  subject: `Invoice #${invoice.number} from ${organization.name}`,
  variables: {
    clientName: client.displayName,
    invoiceNumber: invoice.number,
    amount: formatCurrency(invoice.amount),
    dueDate: formatDate(invoice.dueDate),
    viewUrl: `${baseUrl}/invoices/${invoice.id}`,
  },
  tags: ['invoice', 'transactional'],
});
```

---

## Firestore-Triggered Emails

A3 uses Firestore triggers to automatically send emails based on data changes.

### Email Queue Pattern

```typescript
// functions/src/triggers/email-triggers.ts
import * as functions from 'firebase-functions';
import { sendEmail, sendTemplateEmail } from '../utils/send-email';

// Trigger: new document in email_queue collection
export const processEmailQueue = functions.firestore
  .document('organizations/{orgId}/email_queue/{emailId}')
  .onCreate(async (snapshot, context) => {
    const email = snapshot.data();
    const { orgId, emailId } = context.params;

    try {
      let result;

      if (email.template) {
        result = await sendTemplateEmail({
          to: email.to,
          template: email.template,
          variables: email.variables || {},
          subject: email.subject,
          from: email.from,
          tags: email.tags || [],
        });
      } else {
        result = await sendEmail({
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          from: email.from,
          tags: email.tags || [],
        });
      }

      // Mark as sent
      await snapshot.ref.update({
        status: 'sent',
        mailgunId: result.id,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err: any) {
      // Mark as failed
      await snapshot.ref.update({
        status: 'failed',
        error: err.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
```

### Direct Trigger Pattern

Some events trigger emails directly without the queue:

```typescript
// When a deal is assigned, email the assignee
export const onDealAssigned = functions.firestore
  .document('organizations/{orgId}/deals/{dealId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger if assignedTo changed
    if (before.assignedTo === after.assignedTo) return;
    if (!after.assignedTo) return;

    const assignee = await admin.auth().getUser(after.assignedTo);

    await sendTemplateEmail({
      to: assignee.email!,
      template: 'deal-assigned',
      subject: `New deal assigned: ${after.title}`,
      variables: {
        userName: assignee.displayName || 'Team member',
        dealTitle: after.title,
        clientName: after.clientName,
        dealUrl: `${baseUrl}/deals/${context.params.dealId}`,
      },
      tags: ['deal-assignment', 'notification'],
    });
  });
```

---

## Domain Management — `domains.ts`

### List Domains

```typescript
// GET /mailgun/domains — List configured domains
export async function listDomains(req: Request, res: Response) {
  const result = await mg.domains.list();
  return res.json(result);
  // Returns: { items: [{ name, state, type, ... }], total_count }
}
```

### Get Domain Details

```typescript
// GET /mailgun/domains/:domain — Get domain info and DNS records
export async function getDomain(req: Request, res: Response) {
  const { domain } = req.params;
  const result = await mg.domains.get(domain);
  return res.json(result);
  // Returns: { domain: { name, state, ... }, receiving_dns_records, sending_dns_records }
}
```

### Add Domain

```typescript
// POST /mailgun/domains — Add a new sending domain
export async function addDomain(req: Request, res: Response) {
  const { domain, dkimKeySize } = req.body;

  const result = await mg.domains.create({
    name: domain,
    spam_action: 'disabled',
    dkim_key_size: dkimKeySize || 2048,
    web_scheme: 'https',
    wildcard: false,
  });

  return res.json(result);
  // Returns domain info + required DNS records for verification
}
```

### Verify Domain

```typescript
// POST /mailgun/domains/:domain/verify — Trigger DNS verification
export async function verifyDomain(req: Request, res: Response) {
  const { domain } = req.params;
  const result = await mg.domains.verify(domain);
  return res.json(result);
  // Mailgun re-checks DNS records; state becomes 'active' if verified
}
```

### Domain States

| State | Meaning |
|---|---|
| `active` | Domain verified and ready for sending |
| `unverified` | DNS records not yet confirmed |
| `disabled` | Domain disabled by Mailgun (abuse, etc.) |

### Required DNS Records

When adding a domain, Mailgun requires these DNS records:

| Record Type | Purpose | Example |
|---|---|---|
| TXT | SPF verification | `v=spf1 include:mailgun.org ~all` |
| TXT | DKIM signing | `k=rsa; p=MIGfMA0G...` |
| CNAME | Tracking (opens/clicks) | `mailgun.org` |
| MX (optional) | Receiving email | `mxa.mailgun.org` / `mxb.mailgun.org` |

---

## Event Tracking / Webhooks — `events.ts`

### Webhook Receiver

```typescript
// POST /mailgun/events — Webhook endpoint for Mailgun events
export async function handleMailgunWebhook(req: Request, res: Response) {
  const { signature, 'event-data': eventData } = req.body;

  // Verify webhook signature
  if (!verifyMailgunSignature(signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = eventData.event;
  const messageId = eventData.message?.headers?.['message-id'];
  const recipient = eventData.recipient;

  switch (event) {
    case 'delivered':
      await handleDelivered(eventData);
      break;
    case 'opened':
      await handleOpened(eventData);
      break;
    case 'clicked':
      await handleClicked(eventData);
      break;
    case 'failed':
      await handleFailed(eventData);
      break;
    case 'complained':
      await handleComplained(eventData);
      break;
    case 'unsubscribed':
      await handleUnsubscribed(eventData);
      break;
    default:
      console.log(`Unhandled Mailgun event: ${event}`);
  }

  res.status(200).json({ received: true });
}
```

### Signature Verification

```typescript
import crypto from 'crypto';

function verifyMailgunSignature(signature: {
  timestamp: string;
  token: string;
  signature: string;
}): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY!;

  const encodedToken = crypto
    .createHmac('sha256', signingKey)
    .update(signature.timestamp.concat(signature.token))
    .digest('hex');

  return encodedToken === signature.signature;
}
```

### Event Handlers

```typescript
async function handleDelivered(eventData: any) {
  const messageId = eventData.message?.headers?.['message-id'];
  const recipient = eventData.recipient;

  await admin.firestore().collection('email_events').add({
    event: 'delivered',
    messageId,
    recipient,
    timestamp: new Date(eventData.timestamp * 1000),
    deliveryStatus: eventData['delivery-status'],
  });

  // Update email_queue record if it exists
  const emailQuery = await admin.firestore()
    .collectionGroup('email_queue')
    .where('mailgunId', '==', `<${messageId}>`)
    .limit(1)
    .get();

  if (!emailQuery.empty) {
    await emailQuery.docs[0].ref.update({
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function handleFailed(eventData: any) {
  const severity = eventData.severity; // 'temporary' or 'permanent'
  const reason = eventData.reason;
  const recipient = eventData.recipient;

  await admin.firestore().collection('email_events').add({
    event: 'failed',
    severity,
    reason,
    recipient,
    timestamp: new Date(eventData.timestamp * 1000),
    errorCode: eventData['delivery-status']?.code,
    errorMessage: eventData['delivery-status']?.message,
  });

  if (severity === 'permanent') {
    // Mark recipient as bounced — do not send future emails
    await markEmailBounced(recipient);
  }
}

async function handleComplained(eventData: any) {
  const recipient = eventData.recipient;

  // Spam complaint — suppress this email address
  await admin.firestore().collection('email_suppressions').doc(recipient).set({
    reason: 'complaint',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleUnsubscribed(eventData: any) {
  const recipient = eventData.recipient;

  await admin.firestore().collection('email_suppressions').doc(recipient).set({
    reason: 'unsubscribed',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleOpened(eventData: any) {
  const messageId = eventData.message?.headers?.['message-id'];

  await admin.firestore().collection('email_events').add({
    event: 'opened',
    messageId,
    recipient: eventData.recipient,
    timestamp: new Date(eventData.timestamp * 1000),
    ip: eventData.ip,
    userAgent: eventData['user-agent'],
    geolocation: eventData.geolocation,
  });
}

async function handleClicked(eventData: any) {
  const messageId = eventData.message?.headers?.['message-id'];

  await admin.firestore().collection('email_events').add({
    event: 'clicked',
    messageId,
    recipient: eventData.recipient,
    url: eventData.url,
    timestamp: new Date(eventData.timestamp * 1000),
    ip: eventData.ip,
    userAgent: eventData['user-agent'],
  });
}
```

### Mailgun Event Types

| Event | Description | A3 Action |
|---|---|---|
| `accepted` | Mailgun accepted the message | Log |
| `delivered` | Message delivered to recipient's SMTP server | Update status |
| `opened` | Recipient opened the email (pixel tracking) | Log for analytics |
| `clicked` | Recipient clicked a link | Log for analytics |
| `failed` (temporary) | Temporary delivery failure (retry) | Log, Mailgun retries |
| `failed` (permanent) | Permanent failure (bounce) | Suppress email address |
| `complained` | Recipient marked as spam | Suppress email address |
| `unsubscribed` | Recipient clicked unsubscribe | Suppress email address |
| `stored` | Message stored (when using routes) | N/A in A3 |

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
