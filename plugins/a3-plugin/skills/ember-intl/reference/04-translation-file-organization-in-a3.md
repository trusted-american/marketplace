## 3. Translation File Organization in A3

### 3.1 File Location and Format

Translations live in the `translations/` directory at the app root:

```
translations/
├── en-us.yaml    # English (US) — primary locale
└── es.yaml       # Spanish (if applicable)
```

A3 uses YAML format (not JSON). YAML is preferred for readability and ease of editing, especially for non-developer translators.

### 3.2 YAML Structure and Namespacing

Translation keys are organized hierarchically. The top-level keys are feature names, and nested keys follow consistent conventions:

```yaml
# translations/en-us.yaml

# ---- Global keys (shared across features) ----
buttons:
  save: "Save"
  cancel: "Cancel"
  delete: "Delete"
  edit: "Edit"
  create: "Create New"
  search: "Search..."
  back: "Back"
  next: "Next"
  previous: "Previous"
  submit: "Submit"
  close: "Close"
  confirm: "Confirm"
  retry: "Retry"
  loadMore: "Load More"
  viewAll: "View All"
  download: "Download"
  upload: "Upload"
  add: "Add"
  remove: "Remove"

messages:
  saved: "Record saved successfully"
  deleted: "Record deleted"
  saveFailed: "Failed to save. Please try again."
  confirmDelete: "Are you sure you want to delete this?"
  loading: "Loading..."
  noResults: "No results found"
  error: "An error occurred. Please try again."
  unauthorized: "You are not authorized to perform this action."
  sessionExpired: "Your session has expired. Please log in again."
  networkError: "Network error. Please check your connection."
  validationError: "Please correct the errors below."

# ---- Feature keys (one top-level key per feature) ----
enrollments:
  title: "Enrollments"
  new: "New Enrollment"
  status:
    active: "Active"
    pending: "Pending"
    cancelled: "Cancelled"
    expired: "Expired"
    draft: "Draft"
  fields:
    planName: "Plan Name"
    carrier: "Carrier"
    effectiveDate: "Effective Date"
    premium: "Monthly Premium"
    enrollee: "Enrollee"
    beneficiary: "Beneficiary"
  empty: "No enrollments found"
  count: "{count, plural, =0 {No enrollments} one {1 enrollment} other {{count} enrollments}}"

clients:
  title: "Clients"
  new: "New Client"
  fields:
    firstName: "First Name"
    lastName: "Last Name"
    email: "Email Address"
    phone: "Phone Number"
    dateOfBirth: "Date of Birth"
    ssn: "Social Security Number"
    address: "Address"
  empty: "No clients found"
  count: "{count, plural, =0 {No clients} one {1 client} other {{count} clients}}"
  search: "Search clients..."

policies:
  title: "Policies"
  fields:
    policyNumber: "Policy Number"
    carrier: "Carrier"
    type: "Policy Type"
    premium: "Premium"
    effectiveDate: "Effective Date"
    expirationDate: "Expiration Date"
  status:
    active: "Active"
    lapsed: "Lapsed"
    cancelled: "Cancelled"
  empty: "No policies found"
```

### 3.3 Namespacing Conventions

Follow these patterns for ALL new translation keys:

| Pattern | Usage | Example Key |
|---------|-------|-------------|
| `buttons.[action]` | Global button labels | `buttons.save` |
| `messages.[type]` | Global messages (success, error, confirm) | `messages.saved` |
| `[feature].title` | Feature page title | `enrollments.title` |
| `[feature].new` | "New [thing]" label | `enrollments.new` |
| `[feature].fields.[field]` | Form field labels | `enrollments.fields.planName` |
| `[feature].status.[status]` | Status badge labels | `enrollments.status.active` |
| `[feature].empty` | Empty state message | `enrollments.empty` |
| `[feature].count` | Pluralized count | `enrollments.count` |
| `[feature].search` | Search placeholder | `clients.search` |
| `[feature].filters.[filter]` | Filter labels | `enrollments.filters.byStatus` |
| `[feature].actions.[action]` | Feature-specific actions | `enrollments.actions.renew` |
| `[feature].confirm.[action]` | Confirmation messages | `enrollments.confirm.cancel` |
| `[feature].errors.[error]` | Feature-specific errors | `enrollments.errors.invalidDate` |

### 3.4 How to Add New Translations

1. Open `translations/en-us.yaml`
2. Find the appropriate feature section (or create one if it is a new feature)
3. Add the key following the namespacing conventions above
4. Use the key in your template or JavaScript code
5. Run the intl lint to verify the key is used correctly

```yaml
# WRONG: flat keys
enrollmentTitle: "Enrollments"
enrollmentNew: "New Enrollment"

# RIGHT: namespaced keys
enrollments:
  title: "Enrollments"
  new: "New Enrollment"
```

---
