## The 39 HTTPS Endpoint Files Organized by Service

Each file is in `functions/src/https/` and exports an Express app wrapped with `onRequest`.

### Stripe Integration (6 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `stripe/customers.ts` | `stripeCustomers` | CRUD operations for Stripe customers — create, read, update, delete customer records, sync with Firestore clients |
| `stripe/subscriptions.ts` | `stripeSubscriptions` | Manage subscriptions — create, update, cancel, resume, list subscriptions, handle plan changes and proration |
| `stripe/invoices.ts` | `stripeInvoices` | Invoice management — list invoices, send invoices, mark as paid, void, generate PDF download URLs |
| `stripe/payments.ts` | `stripePayments` | One-time payments — create payment intents, confirm payments, handle 3D Secure, process refunds |
| `stripe/webhooks.ts` | `stripeWebhooks` | Receives and processes Stripe webhook events — payment succeeded/failed, subscription changes, invoice events, dispute handling |
| `stripe/connect.ts` | `stripeConnect` | Stripe Connect for agencies — create connected accounts, handle onboarding, manage payouts, transfer funds |

### Mailgun Integration (4 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `mailgun/send.ts` | `mailgunSend` | Send transactional emails — enrollment confirmations, password resets, welcome emails, notifications, uses HTML templates |
| `mailgun/templates.ts` | `mailgunTemplates` | Manage email templates — CRUD for Mailgun stored templates, preview rendering with merge variables |
| `mailgun/webhooks.ts` | `mailgunWebhooks` | Receives Mailgun webhook events — delivered, opened, clicked, bounced, complained, unsubscribed; updates email delivery status in Firestore |
| `mailgun/lists.ts` | `mailgunLists` | Mailing list management — create/update lists, add/remove members, used for marketing campaigns and agency-wide announcements |

### Algolia Integration (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `algolia/sync.ts` | `algoliaSync` | Bulk sync Firestore collections to Algolia — full reindex for clients, enrollments, agencies, carriers; used for initial setup and recovery |
| `algolia/search.ts` | `algoliaSearch` | Server-side search proxy — performs Algolia searches with secured API key, filters results by agency permissions |
| `algolia/config.ts` | `algoliaConfig` | Manage Algolia index configuration — update searchable attributes, facets, ranking, synonyms, rules |

### PandaDoc Integration (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `pandadoc/documents.ts` | `pandadocDocuments` | Create and manage documents — generate insurance applications, proposals, contracts from templates with client/enrollment data |
| `pandadoc/webhooks.ts` | `pandadocWebhooks` | Receives PandaDoc webhook events — document viewed, completed, voided; updates Firestore enrollment status on signature completion |
| `pandadoc/templates.ts` | `pandadocTemplates` | List and manage document templates — retrieve available templates, preview with sample data |

### HubSpot Integration (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `hubspot/contacts.ts` | `hubspotContacts` | Sync contacts between Firestore and HubSpot — create, update, delete contacts, map A3 fields to HubSpot properties |
| `hubspot/deals.ts` | `hubspotDeals` | Manage HubSpot deals — create deals from enrollments, update deal stages on status changes, associate deals with contacts |
| `hubspot/webhooks.ts` | `hubspotWebhooks` | Receives HubSpot webhook events — contact/deal changes made in HubSpot, syncs back to Firestore |

### OpenAI Integration (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `openai/chat.ts` | `openaiChat` | AI-powered chat assistant — answers agent questions about insurance products, policy details, compliance requirements |
| `openai/summarize.ts` | `openaiSummarize` | Summarize documents and notes — generates summaries of client interactions, enrollment histories, meeting notes |
| `openai/analyze.ts` | `openaiAnalyze` | Data analysis — lead scoring for inquiries, risk assessment for enrollments, recommendation engine for quotes |

### Reporting & Analytics (4 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `reports/commissions.ts` | `commissionReports` | Generate commission reports — by agent, agency, carrier, date range; calculates totals, splits, overrides; exports to CSV/PDF |
| `reports/enrollments.ts` | `enrollmentReports` | Enrollment analytics — active/pending/cancelled breakdowns, trends over time, carrier distribution, premium analysis |
| `reports/production.ts` | `productionReports` | Agent production reports — new business, renewals, retention rates, revenue per agent, leaderboards |
| `reports/export.ts` | `dataExport` | Bulk data export — exports filtered Firestore data to CSV/Excel, handles large datasets via streaming, tracks export jobs |

### Import & Data Processing (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `imports/csv.ts` | `csvImport` | Import data from CSV — parse uploaded CSV files, validate rows, create/update Firestore documents, handle duplicates, track import progress |
| `imports/statements.ts` | `statementImport` | Commission statement processing — parse carrier commission statements (CSV/Excel), match to enrollments, create transaction records |
| `imports/carriers.ts` | `carrierDataImport` | Import carrier data — product catalogs, rate tables, plan details; normalize and store in Firestore |

### Admin & System (4 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `admin/users.ts` | `adminUsers` | User management — create users with custom claims, update roles/permissions, disable/enable accounts, impersonate users |
| `admin/agencies.ts` | `adminAgencies` | Agency management — onboard new agencies, configure settings, manage billing, toggle features |
| `admin/migration.ts` | `adminMigration` | Data migration tools — run migrations to update document schemas, backfill new fields, restructure collections |
| `admin/health.ts` | `healthCheck` | System health check — verifies connectivity to Firestore, Auth, Storage, external APIs; returns status dashboard |

### Authentication & Security (3 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `auth/custom-token.ts` | `authCustomToken` | Generate custom auth tokens — for SSO integration, cross-platform login, service-to-service authentication |
| `auth/verify.ts` | `authVerify` | Token verification endpoint — validates ID tokens, returns decoded claims, used by external services integrating with A3 |
| `auth/mfa.ts` | `authMfa` | MFA management — enroll/unenroll phone numbers, generate TOTP secrets, verify MFA codes |

### Neon PostgreSQL Integration (2 endpoints)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `neon/sync.ts` | `neonSync` | Sync Firestore data to Neon PostgreSQL — maintains relational mirror of key collections for complex reporting queries |
| `neon/query.ts` | `neonQuery` | Execute complex analytical queries — joins, aggregations, window functions that Firestore cannot perform natively |

### File Processing (1 endpoint)
| File | Endpoint | What It Does |
|------|----------|-------------|
| `files/process.ts` | `fileProcess` | File processing pipeline — receives uploaded files, generates thumbnails, extracts text from PDFs, scans for malware, stores metadata |

---
