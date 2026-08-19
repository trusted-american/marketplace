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
