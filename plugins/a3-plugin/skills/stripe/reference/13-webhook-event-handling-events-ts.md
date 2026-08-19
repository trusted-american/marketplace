## Webhook Event Handling — `events.ts`

This is the most critical file. It receives all Stripe webhook events and dispatches them.

```typescript
// functions/src/stripe/events.ts
import stripe from '../utils/stripe';
import { Request, Response } from 'express';

export async function handleWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;
    case 'account.updated':
      await handleAccountUpdated(event.data.object);
      break;
    case 'payout.paid':
      await handlePayoutPaid(event.data.object);
      break;
    case 'payout.failed':
      await handlePayoutFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}
```

### Webhook Signature Verification

**Critical**: Always verify the webhook signature using `stripe.webhooks.constructEvent`. This requires access to the raw request body (`req.rawBody`). In Cloud Functions, this is available when the function is configured to parse raw body.

### Webhook Events Handled in A3

| Event | Handler | Firestore Update |
|---|---|---|
| `checkout.session.completed` | Fulfill purchase, activate subscription | `users/{uid}.subscription` |
| `customer.subscription.created` | Record subscription start | `subscriptions/{subId}` |
| `customer.subscription.updated` | Update plan, status changes | `subscriptions/{subId}` |
| `customer.subscription.deleted` | Revoke access | `users/{uid}.subscription` |
| `invoice.payment_succeeded` | Record payment, extend access | `invoices/{invId}` |
| `invoice.payment_failed` | Trigger dunning flow | `users/{uid}.paymentStatus` |
| `account.updated` | Update Connect status | `users/{uid}.stripeConnect` |
| `payout.paid` | Record successful payout | `payouts/{payoutId}` |
| `payout.failed` | Alert user of payout failure | `payouts/{payoutId}` |

### Idempotency

Stripe may send the same event multiple times. A3 handles this by:

1. Storing `event.id` in Firestore `stripe_events/{eventId}`.
2. Checking for existence before processing.
3. Using Firestore transactions for state mutations.

---
