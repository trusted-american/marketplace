---
name: pandadoc
description: PandaDoc document automation reference — 5 backend files. Document creation from templates, e-signatures, form submissions, and webhook notifications
version: 0.1.0
---

# PandaDoc Document Automation Reference

A3 integrates PandaDoc for automated document creation, e-signature collection, form submissions, and lifecycle tracking. This skill covers the 5 backend files, the full document lifecycle, template token population, recipient management, and webhook notification handling.

---

## Architecture Overview

### Backend File Map

| File | Purpose |
|---|---|
| `functions/src/pandadoc/documents.ts` | Document CRUD — create from template, send, status check, download |
| `functions/src/pandadoc/templates.ts` | Template listing and detail retrieval |
| `functions/src/pandadoc/forms.ts` | Form submission handling |
| `functions/src/pandadoc/notify.ts` | Webhook notification receiver for document events |
| `functions/src/utils/pandadoc.ts` | Shared PandaDoc API client and auth config |

### API Authentication

PandaDoc uses API key authentication via the `Authorization` header:

```typescript
// functions/src/utils/pandadoc.ts
import axios, { AxiosInstance } from 'axios';

const PANDADOC_API_BASE = 'https://api.pandadoc.com/public/v1';

const pandadocClient: AxiosInstance = axios.create({
  baseURL: PANDADOC_API_BASE,
  headers: {
    Authorization: `API-Key ${process.env.PANDADOC_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export default pandadocClient;
```

### Key Points

- **API key**: Stored in Cloud Functions environment config as `PANDADOC_API_KEY`.
- **Base URL**: All calls target `https://api.pandadoc.com/public/v1`.
- **Rate limits**: PandaDoc enforces rate limits; A3 handles 429 responses with exponential backoff.
- **Axios instance**: A shared Axios instance ensures consistent auth headers and base URL.

---

## Documents API — `documents.ts`

### Create Document from Template

This is the primary operation: populating a PandaDoc template with A3 data and sending it for signature.

```typescript
// POST /pandadoc/documents — Create from template
const response = await pandadocClient.post('/documents', {
  name: `Service Agreement - ${clientName}`,
  template_uuid: templateId,
  recipients: [
    {
      email: clientEmail,
      first_name: clientFirstName,
      last_name: clientLastName,
      role: 'Client',
      signing_order: 1,
    },
    {
      email: providerEmail,
      first_name: providerFirstName,
      last_name: providerLastName,
      role: 'Provider',
      signing_order: 2,
    },
  ],
  tokens: [
    { name: 'client.name', value: clientName },
    { name: 'client.email', value: clientEmail },
    { name: 'client.address', value: clientAddress },
    { name: 'service.description', value: serviceDescription },
    { name: 'service.price', value: formatCurrency(price) },
    { name: 'agreement.date', value: formatDate(new Date()) },
    { name: 'agreement.expiry', value: formatDate(expiryDate) },
  ],
  fields: {
    'service_start_date': {
      value: startDate,
      role: 'Client',
    },
  },
  metadata: {
    firebaseUid: uid,
    organizationId: orgId,
    dealId: dealId,
  },
  tags: ['auto-generated', 'service-agreement'],
  parse_form_fields: false,
});

const documentId = response.data.id;
// Store documentId in Firestore for tracking
```

### Token Population Pattern

Tokens are placeholder strings in the PandaDoc template (e.g., `{{client.name}}`). A3 maps Firestore data to tokens:

| Token | Firestore Source | Example Value |
|---|---|---|
| `client.name` | `clients/{id}.displayName` | "Jane Smith" |
| `client.email` | `clients/{id}.email` | "jane@example.com" |
| `client.address` | `clients/{id}.address.formatted` | "123 Main St, City, ST 12345" |
| `service.description` | `deals/{id}.serviceDescription` | "Monthly consulting" |
| `service.price` | `deals/{id}.price` | "$2,500.00" |
| `agreement.date` | Computed at creation time | "March 15, 2026" |
| `agreement.expiry` | Computed: creation + 30 days | "April 14, 2026" |

### Recipient Roles

PandaDoc templates define roles. A3 maps these to actual people:

- **Client**: The person receiving the service, signs first.
- **Provider**: The service provider, signs second.
- **Witness** (optional): A third party for legal agreements.
- **CC**: Recipients who receive a copy but do not sign.

```typescript
// Adding a CC recipient (no signature required)
recipients.push({
  email: managerEmail,
  first_name: managerFirstName,
  last_name: managerLastName,
  role: 'CC',
});
```

### Send Document for Signature

After creating a document, it enters `document.draft` status. You must explicitly send it:

```typescript
// POST /pandadoc/documents/:id/send — Send for signature
await pandadocClient.post(`/documents/${documentId}/send`, {
  message: 'Please review and sign this agreement.',
  subject: 'Service Agreement Ready for Signature',
  silent: false, // true = no email notification
});
```

### Check Document Status

```typescript
// GET /pandadoc/documents/:id — Get status
const response = await pandadocClient.get(`/documents/${documentId}`);
const status = response.data.status;
// Possible statuses: document.draft, document.sent, document.viewed,
// document.waiting_approval, document.approved, document.rejected,
// document.waiting_pay, document.paid, document.completed, document.voided
```

### Document Status Lifecycle

```
draft -> sent -> viewed -> completed
                      \-> rejected
                      \-> voided
```

| Status | Description |
|---|---|
| `document.draft` | Created but not yet sent |
| `document.sent` | Sent to recipients for signature |
| `document.viewed` | At least one recipient opened the document |
| `document.waiting_approval` | Awaiting internal approval before sending |
| `document.approved` | Internally approved, ready to send |
| `document.rejected` | Rejected by a recipient or approver |
| `document.waiting_pay` | Awaiting payment (if payment step enabled) |
| `document.paid` | Payment received |
| `document.completed` | All signatures collected |
| `document.voided` | Voided by sender |

### Download Signed Document

```typescript
// GET /pandadoc/documents/:id/download — Download PDF
const response = await pandadocClient.get(
  `/documents/${documentId}/download`,
  { responseType: 'arraybuffer' },
);
const pdfBuffer = Buffer.from(response.data);

// Upload to Firebase Storage
const bucket = admin.storage().bucket();
const file = bucket.file(`documents/${organizationId}/${documentId}.pdf`);
await file.save(pdfBuffer, {
  contentType: 'application/pdf',
  metadata: {
    firebaseUid: uid,
    documentId: documentId,
  },
});
```

### List Documents

```typescript
// GET /pandadoc/documents — List with filters
const response = await pandadocClient.get('/documents', {
  params: {
    q: searchQuery,           // text search
    status: 'document.completed',
    tag: 'service-agreement',
    count: 50,                // results per page
    page: 1,
    order_by: 'date_created',
    metadata: [`firebaseUid:${uid}`],
  },
});
```

### Delete Document

```typescript
// DELETE /pandadoc/documents/:id — Delete
await pandadocClient.delete(`/documents/${documentId}`);
```

---

## Templates API — `templates.ts`

### List Templates

```typescript
// GET /pandadoc/templates — List available templates
const response = await pandadocClient.get('/templates', {
  params: {
    q: searchQuery,
    count: 25,
    page: 1,
    tag: ['active'],
    folder_uuid: folderId,
  },
});

const templates = response.data.results;
// Each template: { id, name, date_created, date_modified, version }
```

### Get Template Details

```typescript
// GET /pandadoc/templates/:id/details — Get template fields and roles
const response = await pandadocClient.get(`/templates/${templateId}/details`);
const template = response.data;

// template.tokens — array of token names defined in template
// template.roles — array of roles (e.g., Client, Provider)
// template.fields — form fields defined in template
// template.images — image placeholders
```

### Template Management in A3

A3 stores a mapping of template IDs to document types in Firestore:

```typescript
// Firestore: settings/pandadoc/templates
{
  serviceAgreement: 'tmpl_abc123...',
  nda: 'tmpl_def456...',
  invoice: 'tmpl_ghi789...',
  proposalLetter: 'tmpl_jkl012...',
}
```

This allows A3 to look up the correct template UUID by logical name rather than hardcoding IDs.

---

## Forms API — `forms.ts`

PandaDoc forms allow external data collection without requiring a full document.

### Handle Form Submission

```typescript
// POST /pandadoc/forms/:id/submit — Process form data
export async function handleFormSubmission(req: Request, res: Response) {
  const { formId } = req.params;
  const formData = req.body;

  // Retrieve form details
  const formResponse = await pandadocClient.get(`/forms/${formId}`);
  const form = formResponse.data;

  // Map form fields to Firestore data
  const clientData = {
    name: formData.fields.find((f: any) => f.name === 'full_name')?.value,
    email: formData.fields.find((f: any) => f.name === 'email')?.value,
    phone: formData.fields.find((f: any) => f.name === 'phone')?.value,
    company: formData.fields.find((f: any) => f.name === 'company')?.value,
    message: formData.fields.find((f: any) => f.name === 'message')?.value,
  };

  // Create or update client in Firestore
  await admin.firestore()
    .collection('organizations').doc(orgId)
    .collection('clients').add({
      ...clientData,
      source: 'pandadoc_form',
      formId: formId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return res.json({ success: true });
}
```

---

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

## Full Document Lifecycle in A3

### Step-by-Step Flow

1. **User triggers document creation** in A3 frontend (e.g., clicks "Send Agreement" on a deal).
2. **Frontend calls backend**: `POST /pandadoc/documents` with deal ID.
3. **Backend loads data** from Firestore: client info, deal details, organization settings.
4. **Backend maps data to tokens** and populates the template.
5. **PandaDoc creates the document** from the template, returns `document.id`.
6. **Backend stores document reference** in Firestore under the deal.
7. **Backend sends document**: `POST /pandadoc/documents/:id/send`.
8. **PandaDoc emails recipients** with a signing link.
9. **Recipient opens link** — webhook fires `document_state_changed` with `document.viewed`.
10. **Recipient signs** — webhook fires `recipient_completed`.
11. **All recipients sign** — webhook fires `document_state_changed` with `document.completed`.
12. **A3 downloads signed PDF** and stores in Firebase Storage.
13. **A3 updates deal status** in Firestore to reflect signed agreement.

### Retry and Error Handling

```typescript
async function createDocumentWithRetry(payload: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await pandadocClient.post('/documents', payload);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(err.response.headers['retry-after'] || '5', 10);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      if (err.response?.status >= 500 && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        continue;
      }
      throw err;
    }
  }
}
```

### Error Codes

| HTTP Status | Meaning | A3 Response |
|---|---|---|
| 400 | Bad request (invalid params) | Return validation error to user |
| 401 | Invalid API key | Log critical error, alert ops |
| 403 | Forbidden (plan limits) | Inform user of plan limitation |
| 404 | Document/template not found | Return not found to user |
| 429 | Rate limited | Retry with exponential backoff |
| 500+ | PandaDoc server error | Retry, then fail with message |

---

## Environment Variables Required

| Variable | Description |
|---|---|
| `PANDADOC_API_KEY` | API key from PandaDoc dashboard |
| `PANDADOC_WEBHOOK_SECRET` | Shared secret for webhook verification (optional) |

---

## Common Patterns and Best Practices

1. **Always use metadata**: Attach `firebaseUid`, `organizationId`, and `dealId` to every document. This enables Firestore lookups from webhooks.
2. **Template versioning**: When PandaDoc templates are updated, test token mapping in staging before deploying.
3. **Idempotent webhook handlers**: Store processed event IDs to prevent duplicate processing.
4. **PDF archival**: Always download and store the signed PDF in Firebase Storage. Do not rely solely on PandaDoc for long-term storage.
5. **Timeout handling**: PandaDoc document creation can take several seconds. Set appropriate timeouts on the Axios client (30s minimum).
6. **Sandbox mode**: PandaDoc provides a sandbox environment for testing. Use the sandbox API key in staging environments.
