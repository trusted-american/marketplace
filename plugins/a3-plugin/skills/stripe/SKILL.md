---
name: stripe
description: Deep Stripe integration reference — 18 backend files + 5 frontend files. Checkout sessions, subscriptions, customers, invoices, payouts, accounts, webhooks, and Connect platform
version: 0.1.0
---

# Stripe Integration Reference

A3 integrates Stripe across 17+ backend endpoint files, a shared utility module, and frontend Checkout via `@stripe/stripe-js`. This skill covers every Stripe resource, webhook event, Connect platform pattern, the full checkout flow, subscription lifecycle, and error handling used in A3.

---

## Architecture Overview

### Backend File Map

| File | Stripe Resource | Purpose |
|---|---|---|
| `functions/src/stripe/accounts.ts` | `stripe.accounts` | Connect account CRUD |
| `functions/src/stripe/account-links.ts` | `stripe.accountLinks` | Connect onboarding links |
| `functions/src/stripe/balances.ts` | `stripe.balance` | Account balance retrieval |
| `functions/src/stripe/charges.ts` | `stripe.charges` | Charge listing and retrieval |
| `functions/src/stripe/checkout/sessions.ts` | `stripe.checkout.sessions` | Checkout Session creation |
| `functions/src/stripe/coupons.ts` | `stripe.coupons` | Coupon CRUD |
| `functions/src/stripe/customers.ts` | `stripe.customers` | Customer CRUD |
| `functions/src/stripe/events.ts` | `stripe.webhooks` | Webhook event ingestion |
| `functions/src/stripe/invoices.ts` | `stripe.invoices` | Invoice operations |
| `functions/src/stripe/login-links.ts` | `stripe.accounts` | Express dashboard login links |
| `functions/src/stripe/payouts.ts` | `stripe.payouts` | Payout listing |
| `functions/src/stripe/payment-intents.ts` | `stripe.paymentIntents` | PaymentIntent operations |
| `functions/src/stripe/payment-methods.ts` | `stripe.paymentMethods` | PaymentMethod listing/detach |
| `functions/src/stripe/prices.ts` | `stripe.prices` | Price CRUD |
| `functions/src/stripe/products.ts` | `stripe.products` | Product CRUD |
| `functions/src/stripe/promotion-codes.ts` | `stripe.promotionCodes` | Promotion code CRUD |
| `functions/src/stripe/subscriptions.ts` | `stripe.subscriptions` | Subscription lifecycle |
| `functions/src/utils/stripe.ts` | Stripe client init | Shared Stripe instance |

### Frontend Files

| File | Purpose |
|---|---|
| `app/services/stripe.js` | Ember service wrapping `@stripe/stripe-js` |
| `app/components/checkout-*.gts` | Checkout UI components |
| `app/routes/checkout.ts` | Checkout route handler |
| `app/routes/checkout-success.ts` | Post-checkout success route |
| `app/routes/checkout-cancel.ts` | Checkout cancellation route |

---

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

## Stripe Connect — Accounts & Onboarding

A3 uses Stripe Connect (Express accounts) to enable platform payouts to service providers.

### accounts.ts

```typescript
// POST /accounts — Create a Connect account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: userData.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  business_type: 'individual',
  metadata: {
    firebaseUid: uid,
    organizationId: orgId,
  },
});

// GET /accounts/:id — Retrieve account details
const account = await stripe.accounts.retrieve(accountId);

// POST /accounts/:id — Update account
const account = await stripe.accounts.update(accountId, {
  metadata: { key: 'value' },
});

// DELETE /accounts/:id — Delete Connect account
const deleted = await stripe.accounts.del(accountId);
```

### account-links.ts

```typescript
// POST /account-links — Generate onboarding link
const accountLink = await stripe.accountLinks.create({
  account: accountId,
  refresh_url: `${baseUrl}/stripe/onboarding/refresh`,
  return_url: `${baseUrl}/stripe/onboarding/complete`,
  type: 'account_onboarding',
});
// Returns accountLink.url — redirect the user here
```

### login-links.ts

```typescript
// POST /login-links — Generate Express dashboard login
const loginLink = await stripe.accounts.createLoginLink(accountId);
// Returns loginLink.url — opens Stripe Express dashboard
```

### Connect Onboarding Flow

1. User clicks "Set up payments" in A3 frontend.
2. Backend creates a Connect Express account via `accounts.create`.
3. Backend generates an account link via `accountLinks.create`.
4. User is redirected to Stripe-hosted onboarding.
5. On completion, user returns to `return_url`.
6. Webhook `account.updated` fires; backend checks `charges_enabled` and `payouts_enabled`.
7. A3 updates Firestore user document with Connect account status.

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
