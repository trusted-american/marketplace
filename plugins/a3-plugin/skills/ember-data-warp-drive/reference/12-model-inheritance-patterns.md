## Model Inheritance Patterns

Ember Data supports model inheritance. Child models share parent attributes and can add their own.

### Base Model Pattern (A3)

A3 uses a common `BaseModel` that all models extend:

```typescript
// app/models/base.ts
import Model, { attr } from '@ember-data/model';

export default class BaseModel extends Model {
  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;
  @attr('string') declare createdBy: string;
  @attr('string') declare updatedBy: string;
}
```

```typescript
// app/models/client.ts
import BaseModel from './base';
import { attr, hasMany } from '@ember-data/model';

export default class Client extends BaseModel {
  @attr('string') declare firstName: string;
  @attr('string') declare lastName: string;
  // Inherits createdAt, updatedAt, createdBy, updatedBy
}
```

### STI-Style Inheritance

For models that share a Firestore collection but differ by a `type` discriminator:

```typescript
// app/models/notification.ts (base)
export default class Notification extends BaseModel {
  @attr('string') declare type: string;
  @attr('string') declare message: string;
  @attr('boolean') declare isRead: boolean;
}

// app/models/email-notification.ts
export default class EmailNotification extends Notification {
  @attr('string') declare emailAddress: string;
  @attr('string') declare subject: string;
}

// app/models/sms-notification.ts
export default class SmsNotification extends Notification {
  @attr('string') declare phoneNumber: string;
}
```

### Mixin Pattern (Alternative)

For cross-cutting concerns that don't fit a single inheritance chain:

```typescript
// Reusable attribute sets
function withTimestamps(BaseClass) {
  return class extends BaseClass {
    @attr('date') declare createdAt: Date;
    @attr('date') declare updatedAt: Date;
  };
}

function withSoftDelete(BaseClass) {
  return class extends BaseClass {
    @attr('boolean', { defaultValue: false }) declare isArchived: boolean;
    @attr('null-timestamp') declare archivedAt: Date | null;
  };
}

export default class Client extends withSoftDelete(withTimestamps(Model)) {
  @attr('string') declare firstName: string;
}
```

---
