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
