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
