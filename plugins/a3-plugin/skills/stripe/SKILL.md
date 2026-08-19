---
name: stripe
description: Deep Stripe integration reference — 18 backend files + 5 frontend files. Checkout sessions, subscriptions, customers, invoices, payouts, accounts, webhooks, and Connect platform
version: 0.1.0
---


# Stripe Integration Reference

A3 integrates Stripe across 17+ backend endpoint files, a shared utility module, and frontend Checkout via `@stripe/stripe-js`. This skill covers every Stripe resource, webhook event, Connect platform pattern, the full checkout flow, subscription lifecycle, and error handling used in A3.

---

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/01-architecture-overview.md` | Architecture Overview |
| `reference/03-stripe-connect-accounts-onboarding.md` | Stripe Connect — Accounts & Onboarding |
| `reference/05-checkout-sessions.md` | Checkout Sessions |
| `reference/06-subscriptions.md` | Subscriptions |
| `reference/13-webhook-event-handling-events-ts.md` | Webhook Event Handling — `events.ts` |

## Shared Stripe Utility — `utils/stripe.ts`

The shared utility initializes a single Stripe SDK instance used by every endpoint file.

```typescript
// functions/src/utils/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export default stripe;
```

### Key Points

- **Single instance**: Every backend file imports `stripe` from this utility. Never instantiate Stripe elsewhere.
- **API version pinning**: The `apiVersion` is pinned to prevent breaking changes. Update this only during a coordinated migration.
- **TypeScript mode**: `typescript: true` enables full type inference on all Stripe API responses.
- **Environment variable**: `STRIPE_SECRET_KEY` is set in Cloud Functions environment config, not in `.env` files committed to source.
- **Test mode vs live mode**: The secret key prefix `sk_test_` vs `sk_live_` determines the mode. A3 uses separate Firebase projects for staging/production, each with their own keys.

---
## Customers

### customers.ts

```typescript
// POST /customers — Create
const customer = await stripe.customers.create({
  email: user.email,
  name: user.displayName,
  metadata: {
    firebaseUid: uid,
  },
});

// GET /customers/:id — Retrieve
const customer = await stripe.customers.retrieve(customerId);

// POST /customers/:id — Update
const customer = await stripe.customers.update(customerId, {
  name: newName,
  email: newEmail,
});

// DELETE /customers/:id — Delete
const deleted = await stripe.customers.del(customerId);

// GET /customers — List with pagination
const customers = await stripe.customers.list({
  limit: 100,
  starting_after: lastCustomerId,
});
```

### Customer-Firestore Sync Pattern

When a customer is created in Stripe, A3 stores `stripeCustomerId` on the Firestore user document. This enables bidirectional lookup:

- **Firestore to Stripe**: Read `user.stripeCustomerId`, call `stripe.customers.retrieve`.
- **Stripe to Firestore**: Webhook payload contains `metadata.firebaseUid`, query Firestore.

---
## Products & Prices

### products.ts

```typescript
// POST /products — Create
const product = await stripe.products.create({
  name: 'Pro Plan',
  description: 'Full access to all features',
  metadata: { tier: 'pro' },
});

// GET /products — List active products
const products = await stripe.products.list({
  active: true,
  limit: 100,
});

// POST /products/:id — Update
const product = await stripe.products.update(productId, {
  name: 'Updated Name',
});

// DELETE /products/:id — Archive
const product = await stripe.products.update(productId, {
  active: false,
});
```

### prices.ts

```typescript
// POST /prices — Create recurring price
const price = await stripe.prices.create({
  product: productId,
  unit_amount: 2999, // $29.99 in cents
  currency: 'usd',
  recurring: {
    interval: 'month',
    interval_count: 1,
  },
  metadata: { tier: 'pro', billing: 'monthly' },
});

// POST /prices — Create one-time price
const price = await stripe.prices.create({
  product: productId,
  unit_amount: 9900,
  currency: 'usd',
});

// GET /prices — List prices for a product
const prices = await stripe.prices.list({
  product: productId,
  active: true,
});
```

---
## Payment Intents & Payment Methods

### payment-intents.ts

```typescript
// POST /payment-intents — Create
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000,
  currency: 'usd',
  customer: customerId,
  payment_method_types: ['card'],
  metadata: { orderId: order.id },
});

// POST /payment-intents/:id/confirm — Confirm
const confirmed = await stripe.paymentIntents.confirm(piId, {
  payment_method: paymentMethodId,
});

// GET /payment-intents/:id — Retrieve
const pi = await stripe.paymentIntents.retrieve(piId);

// POST /payment-intents/:id/cancel — Cancel
const cancelled = await stripe.paymentIntents.cancel(piId);
```

### payment-methods.ts

```typescript
// GET /payment-methods — List for customer
const methods = await stripe.paymentMethods.list({
  customer: customerId,
  type: 'card',
});

// POST /payment-methods/:id/detach — Remove from customer
const detached = await stripe.paymentMethods.detach(pmId);

// POST /payment-methods/:id/attach — Attach to customer
const attached = await stripe.paymentMethods.attach(pmId, {
  customer: customerId,
});
```

---
## Invoices

### invoices.ts

```typescript
// GET /invoices — List for customer
const invoices = await stripe.invoices.list({
  customer: customerId,
  limit: 50,
  status: 'paid',
});

// GET /invoices/:id — Retrieve with line items
const invoice = await stripe.invoices.retrieve(invoiceId, {
  expand: ['lines.data.price.product'],
});

// POST /invoices — Create manual invoice
const invoice = await stripe.invoices.create({
  customer: customerId,
  collection_method: 'send_invoice',
  days_until_due: 30,
});

// POST /invoices/:id/send — Send invoice email
const sent = await stripe.invoices.sendInvoice(invoiceId);

// POST /invoices/:id/void — Void invoice
const voided = await stripe.invoices.voidInvoice(invoiceId);

// POST /invoices/:id/finalize — Finalize draft
const finalized = await stripe.invoices.finalizeInvoice(invoiceId);
```

---
## Coupons & Promotion Codes

### coupons.ts

```typescript
// POST /coupons — Create percentage coupon
const coupon = await stripe.coupons.create({
  percent_off: 25,
  duration: 'repeating',
  duration_in_months: 3,
  name: '25% Off for 3 Months',
});

// POST /coupons — Create fixed amount coupon
const coupon = await stripe.coupons.create({
  amount_off: 500,
  currency: 'usd',
  duration: 'once',
  name: '$5 Off',
});

// GET /coupons — List
const coupons = await stripe.coupons.list({ limit: 25 });

// DELETE /coupons/:id — Delete
const deleted = await stripe.coupons.del(couponId);
```

### promotion-codes.ts

```typescript
// POST /promotion-codes — Create
const promoCode = await stripe.promotionCodes.create({
  coupon: couponId,
  code: 'SAVE25',
  max_redemptions: 100,
  expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  restrictions: {
    first_time_transaction: true,
    minimum_amount: 1000,
    minimum_amount_currency: 'usd',
  },
});

// GET /promotion-codes — List
const promoCodes = await stripe.promotionCodes.list({
  active: true,
  limit: 50,
});
```

---
## Charges & Balances

### charges.ts

```typescript
// GET /charges — List charges
const charges = await stripe.charges.list({
  customer: customerId,
  limit: 100,
});

// GET /charges/:id — Retrieve
const charge = await stripe.charges.retrieve(chargeId);
```

### balances.ts

```typescript
// GET /balances — Retrieve platform balance
const balance = await stripe.balance.retrieve();
// balance.available — funds ready for payout
// balance.pending — funds not yet available

// GET /balances — Retrieve Connect account balance
const balance = await stripe.balance.retrieve({
  stripeAccount: connectAccountId,
});
```

---
## Payouts

### payouts.ts

```typescript
// GET /payouts — List payouts for Connect account
const payouts = await stripe.payouts.list(
  { limit: 25 },
  { stripeAccount: connectAccountId },
);

// POST /payouts — Create manual payout
const payout = await stripe.payouts.create(
  {
    amount: 10000,
    currency: 'usd',
  },
  { stripeAccount: connectAccountId },
);
```

---
## Error Handling Patterns

```typescript
try {
  const result = await stripe.customers.create({ email });
  return res.json(result);
} catch (err) {
  if (err instanceof Stripe.errors.StripeCardError) {
    return res.status(402).json({ error: err.message, code: err.code });
  }
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof Stripe.errors.StripeRateLimitError) {
    return res.status(429).json({ error: 'Rate limited. Retry later.' });
  }
  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    console.error('Stripe API key invalid');
    return res.status(500).json({ error: 'Internal configuration error' });
  }
  console.error('Unexpected Stripe error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}
```

### Error Types

| Error Class | HTTP Status | Cause |
|---|---|---|
| `StripeCardError` | 402 | Card declined, expired, etc. |
| `StripeInvalidRequestError` | 400 | Bad params, missing fields |
| `StripeRateLimitError` | 429 | Too many API calls |
| `StripeAuthenticationError` | 401 | Invalid API key |
| `StripeConnectionError` | 502 | Network issue to Stripe |
| `StripeAPIError` | 500 | Stripe internal error |

---
## Stripe Connect Platform Patterns

### Application Fees

When processing payments on behalf of Connect accounts, A3 takes an application fee:

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{ price: priceId, quantity: 1 }],
  payment_intent_data: {
    application_fee_amount: 250, // $2.50 platform fee
    transfer_data: {
      destination: connectAccountId,
    },
  },
  success_url: successUrl,
  cancel_url: cancelUrl,
});
```

### Direct Charges vs Destination Charges

A3 uses **destination charges** (the platform creates the charge, Stripe automatically transfers funds minus the application fee). This is the recommended approach for marketplaces where the platform controls the checkout experience.

---
## Environment Variables Required

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` (frontend) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` for webhook signature verification |

---
## Common Patterns and Best Practices

1. **Always use metadata**: Attach `firebaseUid` and `organizationId` to every Stripe object. This enables Firestore lookups from webhook handlers.
2. **Expand sparingly**: Use `expand` only when you need nested objects. Each expansion costs API latency.
3. **Pagination**: Always handle `has_more` in list operations. Use `starting_after` for cursor-based pagination.
4. **Idempotency keys**: For POST operations that create resources, pass `idempotencyKey` to prevent duplicates on retries.
5. **Amounts are in cents**: `unit_amount: 2999` means $29.99. Always convert before display.
6. **Currency handling**: Always pass lowercase ISO currency code (`usd`, `eur`, `gbp`).
7. **Test clocks**: Use Stripe test clocks in staging to simulate subscription lifecycle events without waiting.
