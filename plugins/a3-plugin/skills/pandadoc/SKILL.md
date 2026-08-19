---
name: pandadoc
description: PandaDoc document automation reference — 5 backend files. Document creation from templates, e-signatures, form submissions, and webhook notifications
version: 0.1.0
---


# PandaDoc Document Automation Reference

A3 integrates PandaDoc for automated document creation, e-signature collection, form submissions, and lifecycle tracking. This skill covers the 5 backend files, the full document lifecycle, template token population, recipient management, and webhook notification handling.

---

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-documents-api-documents-ts.md` | Documents API — `documents.ts` |
| `reference/05-webhook-notifications-notify-ts.md` | Webhook Notifications — `notify.ts` |
| `reference/06-full-document-lifecycle-in-a3.md` | Full Document Lifecycle in A3 |

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
