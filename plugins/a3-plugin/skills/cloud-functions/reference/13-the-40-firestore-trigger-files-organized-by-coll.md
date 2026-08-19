## The 40 Firestore Trigger Files Organized by Collection

Each file is in `functions/src/triggers/{collection}/` and handles one lifecycle event.

### Clients Collection (4 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `clients/onCreate.ts` | `onDocumentCreated('clients/{clientId}')` | Creates activity record, syncs to Algolia search index, syncs to HubSpot CRM, initializes client metadata |
| `clients/onUpdate.ts` | `onDocumentUpdated('clients/{clientId}')` | Detects field changes, updates Algolia index, syncs changes to HubSpot, creates change-specific activity records, propagates name/email changes to related enrollments |
| `clients/onDelete.ts` | `onDocumentDeleted('clients/{clientId}')` | Removes from Algolia, deletes subcollections (notes, files, activities), removes HubSpot contact, cleans up Storage files, creates deletion activity |
| `clients/onWrite.ts` | `onDocumentWritten('clients/{clientId}')` | Maintains client count aggregation, updates agency-level client statistics |

### Enrollments Collection (4 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `enrollments/onCreate.ts` | `onDocumentCreated('enrollments/{enrollmentId}')` | Creates activity, syncs to Algolia, sends confirmation email via Mailgun, notifies assigned agent, updates client's enrollment count |
| `enrollments/onUpdate.ts` | `onDocumentUpdated('enrollments/{enrollmentId}')` | Detects status transitions (pending->active, active->cancelled), sends status-change emails, updates Algolia, triggers commission calculations on approval, creates activity |
| `enrollments/onDelete.ts` | `onDocumentDeleted('enrollments/{enrollmentId}')` | Removes from Algolia, deletes subcollections, updates client enrollment count, creates deletion activity, cleans up related transactions |
| `enrollments/onWrite.ts` | `onDocumentWritten('enrollments/{enrollmentId}')` | Maintains enrollment count aggregations per agency/carrier, updates dashboard statistics |

### Agencies Collection (3 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `agencies/onCreate.ts` | `onDocumentCreated('agencies/{agencyId}')` | Initializes agency settings, creates default roles, syncs to Algolia, creates welcome notification |
| `agencies/onUpdate.ts` | `onDocumentUpdated('agencies/{agencyId}')` | Updates Algolia, propagates name/address changes to related documents, updates branding assets |
| `agencies/onDelete.ts` | `onDocumentDeleted('agencies/{agencyId}')` | Removes from Algolia, cascades deletion to agency's clients/enrollments (or blocks deletion if data exists) |

### Contracts Collection (3 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `contracts/onCreate.ts` | `onDocumentCreated('contracts/{contractId}')` | Creates activity, syncs to Algolia, notifies carrier, initializes commission schedule |
| `contracts/onUpdate.ts` | `onDocumentUpdated('contracts/{contractId}')` | Detects status changes, updates Algolia, recalculates commission rates on contract amendments, creates activity |
| `contracts/onDelete.ts` | `onDocumentDeleted('contracts/{contractId}')` | Removes from Algolia, handles orphaned enrollments under this contract, creates activity |

### Transactions Collection (3 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `transactions/onCreate.ts` | `onDocumentCreated('transactions/{transactionId}')` | Creates activity, updates running balances, syncs to accounting/Neon PostgreSQL, triggers commission split calculations |
| `transactions/onUpdate.ts` | `onDocumentUpdated('transactions/{transactionId}')` | Recalculates balances on amount changes, updates Neon, adjusts commission splits, creates activity |
| `transactions/onDelete.ts` | `onDocumentDeleted('transactions/{transactionId}')` | Reverses balance updates, syncs deletion to Neon, creates reversal activity |

### Users Collection (3 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `users/onCreate.ts` | `onDocumentCreated('users/{userId}')` | Sets custom claims on Firebase Auth, syncs to Algolia, creates welcome activity, initializes user preferences |
| `users/onUpdate.ts` | `onDocumentUpdated('users/{userId}')` | Updates custom claims on role/permission changes, syncs to Algolia, propagates name changes to authored activities/notes |
| `users/onDelete.ts` | `onDocumentDeleted('users/{userId}')` | Removes from Algolia, disables Firebase Auth account, reassigns owned records, cleans up user-specific data |

### Carriers Collection (3 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `carriers/onCreate.ts` | `onDocumentCreated('carriers/{carrierId}')` | Syncs to Algolia, creates activity, initializes carrier product catalog |
| `carriers/onUpdate.ts` | `onDocumentUpdated('carriers/{carrierId}')` | Updates Algolia, propagates name changes to enrollments/contracts, creates activity |
| `carriers/onDelete.ts` | `onDocumentDeleted('carriers/{carrierId}')` | Removes from Algolia, handles orphaned contracts/enrollments, creates activity |

### Quotes Collection (2 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `quotes/onCreate.ts` | `onDocumentCreated('quotes/{quoteId}')` | Creates activity, generates quote PDF via PandaDoc, sends quote email to client, syncs to Algolia |
| `quotes/onUpdate.ts` | `onDocumentUpdated('quotes/{quoteId}')` | Detects status changes (draft->sent->accepted->declined), updates Algolia, converts accepted quotes to enrollments |

### Tickets Collection (2 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `tickets/onCreate.ts` | `onDocumentCreated('tickets/{ticketId}')` | Creates activity, sends notification to assigned agent, syncs to Algolia, auto-assigns based on rules |
| `tickets/onUpdate.ts` | `onDocumentUpdated('tickets/{ticketId}')` | Detects status changes (open->in-progress->resolved->closed), sends status update notifications, calculates resolution time |

### Groups Collection (2 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `groups/onCreate.ts` | `onDocumentCreated('groups/{groupId}')` | Creates activity, syncs to Algolia, initializes group enrollment tracking |
| `groups/onUpdate.ts` | `onDocumentUpdated('groups/{groupId}')` | Updates Algolia, propagates changes to group members, recalculates group rates |

### Statements Collection (2 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `statements/onCreate.ts` | `onDocumentCreated('statements/{statementId}')` | Parses uploaded commission statement, creates individual transaction records, matches commissions to enrollments |
| `statements/onUpdate.ts` | `onDocumentUpdated('statements/{statementId}')` | Handles reprocessing of statements, updates matched transactions on corrections |

### Licenses Collection (2 triggers)
| File | Trigger | What It Does |
|------|---------|-------------|
| `licenses/onCreate.ts` | `onDocumentCreated('licenses/{licenseId}')` | Creates activity, validates license data, sets expiration reminders |
| `licenses/onUpdate.ts` | `onDocumentUpdated('licenses/{licenseId}')` | Detects expiration date changes, updates reminders, creates activity |

### Activities Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `activities/onCreate.ts` | `onDocumentCreated('activities/{activityId}')` | Sends real-time notifications to relevant users, updates notification badges, syncs to Algolia for activity search |

### Messages Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `messages/onCreate.ts` | `onDocumentCreated('messages/{messageId}')` | Sends push/email notification to recipient, updates unread count, marks message thread as active |

### Events Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `events/onCreate.ts` | `onDocumentCreated('events/{eventId}')` | Creates calendar entries, sends invitations via email, syncs to external calendar services |

### Inquiries Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `inquiries/onCreate.ts` | `onDocumentCreated('inquiries/{inquiryId}')` | Auto-assigns to agent, sends acknowledgment email to lead, creates activity, syncs to HubSpot, triggers lead scoring via OpenAI |

### Notifications Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `notifications/onCreate.ts` | `onDocumentCreated('notifications/{notificationId}')` | Delivers notification via appropriate channel (push, email, in-app), updates delivery status |

### Memberships Collection (1 trigger)
| File | Trigger | What It Does |
|------|---------|-------------|
| `memberships/onUpdate.ts` | `onDocumentUpdated('memberships/{membershipId}')` | Detects status changes, updates client's active membership status, triggers renewal notifications on expiration approach |

---
