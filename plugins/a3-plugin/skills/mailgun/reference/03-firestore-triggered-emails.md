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
