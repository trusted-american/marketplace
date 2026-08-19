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
