## Model Definition — Comprehensive

### Attributes

```typescript
import Model, { attr } from '@ember-data/model';

export default class MyModel extends Model {
  // String
  @attr('string') declare name: string;

  // Number
  @attr('number') declare amount: number;

  // Boolean
  @attr('boolean') declare isActive: boolean;

  // Date (maps to Firestore Timestamp)
  @attr('date') declare createdAt: Date;

  // Nullable timestamp (custom A3 transform)
  @attr('null-timestamp') declare completedAt: Date | null;

  // Default values
  @attr('string', { defaultValue: 'draft' }) declare status: string;
  @attr('number', { defaultValue: 0 }) declare count: number;
  @attr('boolean', { defaultValue: false }) declare isArchived: boolean;

  // Default value with factory (for mutable defaults)
  @attr({ defaultValue: () => [] }) declare tags: string[];
  @attr({ defaultValue: () => ({}) }) declare metadata: Record<string, unknown>;

  // Untyped (raw value from Firestore — no transform applied)
  @attr() declare rawData: unknown;
}
```

### Relationships

```typescript
import Model, { belongsTo, hasMany } from '@ember-data/model';
import type { AsyncBelongsTo, AsyncHasMany } from '@ember-data/model';

export default class Enrollment extends BaseModel {
  // belongsTo — references another document
  @belongsTo('client', { async: true, inverse: 'enrollments' })
  declare client: AsyncBelongsTo<Client>;

  // belongsTo with no inverse (one-directional)
  @belongsTo('carrier', { async: true, inverse: null })
  declare carrier: AsyncBelongsTo<Carrier>;

  // hasMany — subcollection or reference array
  @hasMany('enrollment-file', { async: true, inverse: 'enrollment' })
  declare files: AsyncHasMany<EnrollmentFile>;

  @hasMany('enrollment-note', { async: true, inverse: 'enrollment' })
  declare notes: AsyncHasMany<EnrollmentNote>;
}
```

### Accessing Relationships

```typescript
// In route/component — relationships are async, must await
const client = await enrollment.client;

// In template — auto-resolves (shows loading state)
// {{@enrollment.client.name}}

// Check if relationship is loaded without triggering a fetch
if (enrollment.belongsTo('client').value()) {
  // Already loaded, safe to access synchronously
}

// Get ID without loading the related record
const clientId = enrollment.belongsTo('client').id();
```

### Computed Getters on Models

```typescript
export default class Client extends BaseModel {
  @attr('string') declare firstName: string;
  @attr('string') declare lastName: string;
  @attr('string') declare email: string;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isComplete(): boolean {
    return Boolean(this.firstName && this.lastName && this.email);
  }

  get initials(): string {
    return `${this.firstName?.[0] ?? ''}${this.lastName?.[0] ?? ''}`.toUpperCase();
  }
}
```

---
