## Checkout Sessions

### checkout/sessions.ts

```typescript
// POST /checkout/sessions — Create a Checkout Session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription', // or 'payment' for one-time
  customer: stripeCustomerId,
  line_items: [
    {
      price: priceId,
      quantity: 1,
    },
  ],
  success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/checkout/cancel`,
  subscription_data: {
    metadata: {
      firebaseUid: uid,
      organizationId: orgId,
    },
  },
  allow_promotion_codes: true,
  billing_address_collection: 'required',
  tax_id_collection: { enabled: true },
});

// GET /checkout/sessions/:id — Retrieve session
const session = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription', 'customer'],
});

// GET /checkout/sessions/:id/line-items — List line items
const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
```

### Checkout Modes

| Mode | Use Case | Key Params |
|---|---|---|
| `payment` | One-time purchase | `payment_intent_data` |
| `subscription` | Recurring billing | `subscription_data` |
| `setup` | Save payment method for later | `setup_intent_data` |

### Frontend Checkout Flow

```javascript
// app/services/stripe.js
import { loadStripe } from '@stripe/stripe-js';

export default class StripeService extends Service {
  stripePromise = loadStripe(ENV.STRIPE_PUBLISHABLE_KEY);

  async redirectToCheckout(sessionId) {
    const stripe = await this.stripePromise;
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      this.flashMessages.danger(error.message);
    }
  }
}
```

### Full Checkout Sequence

1. Frontend calls A3 backend: `POST /stripe/checkout/sessions` with `priceId`.
2. Backend creates Checkout Session, returns `session.id` and `session.url`.
3. Frontend either redirects to `session.url` (Stripe-hosted) or uses `stripe.redirectToCheckout({ sessionId })`.
4. User completes payment on Stripe.
5. Stripe redirects to `success_url` with `session_id` query param.
6. Frontend `checkout-success` route calls backend to verify session.
7. Webhook `checkout.session.completed` fires asynchronously for definitive fulfillment.

---
