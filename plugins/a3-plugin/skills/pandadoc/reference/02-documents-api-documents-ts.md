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
