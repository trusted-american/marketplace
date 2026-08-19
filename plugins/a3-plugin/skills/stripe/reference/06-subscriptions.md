## Subscriptions

### subscriptions.ts

```typescript
// POST /subscriptions — Create
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent'],
  metadata: { firebaseUid: uid },
});

// GET /subscriptions/:id — Retrieve
const subscription = await stripe.subscriptions.retrieve(subId, {
  expand: ['default_payment_method', 'latest_invoice'],
});

// POST /subscriptions/:id — Update (change plan)
const subscription = await stripe.subscriptions.update(subId, {
  items: [
    { id: existingItemId, deleted: true },
    { price: newPriceId },
  ],
  proration_behavior: 'create_prorations',
});

// DELETE /subscriptions/:id — Cancel
const subscription = await stripe.subscriptions.cancel(subId);
// or schedule cancellation at period end:
const subscription = await stripe.subscriptions.update(subId, {
  cancel_at_period_end: true,
});

// GET /subscriptions — List for customer
const subscriptions = await stripe.subscriptions.list({
  customer: customerId,
  status: 'all',
  limit: 10,
});
```

### Subscription Lifecycle in A3

| Event | Webhook | A3 Action |
|---|---|---|
| Created | `customer.subscription.created` | Store sub ID in Firestore, grant access |
| Payment succeeds | `invoice.payment_succeeded` | Extend access, update billing date |
| Payment fails | `invoice.payment_failed` | Send dunning email, mark at-risk |
| Updated (plan change) | `customer.subscription.updated` | Update plan tier in Firestore |
| Cancelled | `customer.subscription.deleted` | Revoke access, update status |
| Trial ending | `customer.subscription.trial_will_end` | Send reminder email 3 days before |

### Proration Behavior

When a user upgrades or downgrades mid-cycle, A3 uses `proration_behavior: 'create_prorations'`. This creates proration line items on the next invoice. The options are:

- `create_prorations` — default, adjusts next invoice
- `none` — no adjustment
- `always_invoice` — immediately invoice the proration

---
