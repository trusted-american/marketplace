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
