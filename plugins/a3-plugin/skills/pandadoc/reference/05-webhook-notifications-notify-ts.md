## Webhook Notifications — `notify.ts`

PandaDoc sends webhook notifications when document events occur.

### Webhook Receiver

```typescript
// POST /pandadoc/notify — Webhook endpoint
export async function handlePandaDocWebhook(req: Request, res: Response) {
  const events = req.body;

  // PandaDoc sends an array of events
  for (const event of events) {
    const { event: eventType, data } = event;

    switch (eventType) {
      case 'document_state_changed':
        await handleDocumentStateChange(data);
        break;
      case 'recipient_completed':
        await handleRecipientCompleted(data);
        break;
      case 'document_updated':
        await handleDocumentUpdated(data);
        break;
      case 'document_deleted':
        await handleDocumentDeleted(data);
        break;
      default:
        console.log(`Unhandled PandaDoc event: ${eventType}`);
    }
  }

  // PandaDoc expects a 200 response
  res.status(200).json({ received: true });
}
```

### Document State Change Handler

```typescript
async function handleDocumentStateChange(data: any) {
  const { id: documentId, status, name, metadata } = data;
  const { firebaseUid, organizationId, dealId } = metadata || {};

  // Update Firestore document record
  const docRef = admin.firestore()
    .collection('organizations').doc(organizationId)
    .collection('documents').doc(documentId);

  await docRef.set({
    status: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Take action based on status
  switch (status) {
    case 'document.completed':
      // All signatures collected — download and store PDF
      await downloadAndStorePdf(documentId, organizationId);
      // Update deal status
      if (dealId) {
        await admin.firestore()
          .collection('organizations').doc(organizationId)
          .collection('deals').doc(dealId)
          .update({ documentStatus: 'signed', documentId });
      }
      break;

    case 'document.viewed':
      // Notify sender that recipient opened the document
      if (firebaseUid) {
        await createNotification(firebaseUid, {
          type: 'document_viewed',
          message: `${name} was viewed by a recipient`,
          documentId,
        });
      }
      break;

    case 'document.rejected':
      // Handle rejection — notify sender
      if (firebaseUid) {
        await createNotification(firebaseUid, {
          type: 'document_rejected',
          message: `${name} was rejected`,
          documentId,
        });
      }
      break;
  }
}
```

### Recipient Completed Handler

```typescript
async function handleRecipientCompleted(data: any) {
  const { id: documentId, recipient } = data;

  // Log individual signature event
  await admin.firestore()
    .collection('document_events').add({
      documentId,
      event: 'recipient_completed',
      recipientEmail: recipient.email,
      recipientRole: recipient.role,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
```

### Webhook Events

| Event | Trigger | A3 Action |
|---|---|---|
| `document_state_changed` | Any status transition | Update Firestore, trigger workflows |
| `recipient_completed` | One recipient signs | Log signature, check if all done |
| `document_updated` | Document content edited | Sync metadata |
| `document_deleted` | Document deleted in PandaDoc | Remove from Firestore tracking |
| `document_creation_failed` | Template rendering fails | Alert user, log error |

### Webhook Security

PandaDoc webhooks do not include a signature header like Stripe. A3 validates webhooks by:

1. **Shared secret**: Configuring a webhook secret in PandaDoc dashboard and verifying the `X-PandaDoc-Signature` header when available.
2. **IP allowlisting**: Optionally restricting to PandaDoc's IP ranges.
3. **Metadata verification**: Checking that `metadata.organizationId` matches a valid organization in Firestore.

---
