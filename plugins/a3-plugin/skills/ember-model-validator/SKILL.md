---
name: ember-model-validator
description: ember-model-validator reference — used in 10 A3 models. Client-side model validation rules, custom validators, and error display
version: 0.1.0
---

# ember-model-validator Reference

## Overview

ember-model-validator provides declarative client-side validation for Ember Data models. A3 uses it in 10 models (client, enrollment, contract, agency, user, dependent, carrier, plan, agent, payment) to validate data before saving to Firestore. Validations run client-side and produce error objects that are rendered inline in forms.

## Adding Validations to a Model

Validations are defined as a static `validations` property on the model class. Import the `validateModel` mixin and apply it:

```typescript
import Model, { attr } from '@ember-data/model';
import { buildValidations, validator } from 'ember-model-validator';

export default class ClientModel extends Model {
  @attr('string') declare firstName: string;
  @attr('string') declare lastName: string;
  @attr('string') declare email: string;
  @attr('string') declare phone: string;
  @attr('number') declare age: number;
  @attr('string') declare status: string;

  validations = {
    firstName: {
      presence: true,
      length: { minimum: 2, maximum: 50 },
    },
    lastName: {
      presence: true,
      length: { minimum: 2, maximum: 50 },
    },
    email: {
      presence: true,
      format: { with: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Must be a valid email' },
    },
    phone: {
      format: {
        with: /^\(\d{3}\) \d{3}-\d{4}$/,
        allowBlank: true,
        message: 'Must be format (555) 123-4567',
      },
    },
    age: {
      numericality: { greaterThanOrEqualTo: 0, lessThanOrEqualTo: 120 },
    },
    status: {
      inclusion: { in: ['active', 'pending', 'terminated', 'cobra'] },
    },
  };
}
```

## Built-in Validators

### presence

Validates that the field is not blank (null, undefined, or empty string).

```typescript
validations = {
  firstName: {
    presence: true,
  },
  // With custom message:
  lastName: {
    presence: { message: 'Last name is required' },
  },
};
```

### format

Validates the field against a regular expression pattern.

```typescript
validations = {
  email: {
    format: {
      with: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
      message: 'Must be a valid email address',
    },
  },
  ssn: {
    format: {
      with: /^\d{3}-\d{2}-\d{4}$/,
      allowBlank: true,           // Skip validation if blank
      message: 'Must be format XXX-XX-XXXX',
    },
  },
  zipCode: {
    format: {
      with: /^\d{5}(-\d{4})?$/,
      message: 'Must be a valid ZIP code',
    },
  },
};
```

### length

Validates the length of a string field.

```typescript
validations = {
  firstName: {
    length: {
      minimum: 2,
      maximum: 50,
    },
  },
  description: {
    length: {
      maximum: 500,
      message: 'Description cannot exceed 500 characters',
    },
  },
  stateCode: {
    length: {
      is: 2,                       // Exact length
      message: 'State code must be exactly 2 characters',
    },
  },
};
```

### inclusion

Validates that the field value is one of an allowed set.

```typescript
validations = {
  status: {
    inclusion: {
      in: ['active', 'pending', 'terminated', 'cobra'],
      message: 'Status must be active, pending, terminated, or cobra',
    },
  },
  tier: {
    inclusion: {
      in: ['employee', 'employee-spouse', 'employee-child', 'family'],
      allowBlank: true,
    },
  },
};
```

### exclusion

Validates that the field value is NOT in a disallowed set.

```typescript
validations = {
  username: {
    exclusion: {
      in: ['admin', 'root', 'system', 'superadmin'],
      message: 'This username is reserved',
    },
  },
};
```

### numericality

Validates numeric constraints.

```typescript
validations = {
  age: {
    numericality: {
      onlyInteger: true,
      greaterThanOrEqualTo: 0,
      lessThanOrEqualTo: 120,
      message: 'Age must be a whole number between 0 and 120',
    },
  },
  premium: {
    numericality: {
      greaterThan: 0,
      allowBlank: true,
      message: 'Premium must be greater than zero',
    },
  },
  deductible: {
    numericality: {
      greaterThanOrEqualTo: 0,
      lessThanOrEqualTo: 100000,
    },
  },
};
```

Full list of numericality options:
- `onlyInteger` — must be a whole number
- `greaterThan` — strictly greater than
- `greaterThanOrEqualTo` — greater than or equal
- `lessThan` — strictly less than
- `lessThanOrEqualTo` — less than or equal
- `equalTo` — must equal exactly
- `odd` — must be odd
- `even` — must be even

### acceptance

Validates that a boolean/checkbox field is true (for terms of service, agreements, etc.).

```typescript
validations = {
  termsAccepted: {
    acceptance: true,
  },
  // With custom message:
  privacyPolicyAccepted: {
    acceptance: { message: 'You must accept the privacy policy to continue' },
  },
};
```

### confirmation

Validates that two fields match (commonly for email or password confirmation).

```typescript
validations = {
  email: {
    presence: true,
    format: { with: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ },
  },
  emailConfirmation: {
    confirmation: {
      on: 'email',                 // The field to match against
      message: 'Email addresses must match',
    },
  },
};
```

## Custom Validators

For validation logic that the built-in validators cannot handle, define custom validator functions:

```typescript
validations = {
  effectiveDate: {
    custom: {
      validation(key: string, value: unknown, model: ClientModel) {
        if (!value) return false;
        const date = dayjs(value as string);
        return date.isValid() && date.isAfter(dayjs());
      },
      message: 'Effective date must be in the future',
    },
  },
  terminationDate: {
    custom: {
      validation(key: string, value: unknown, model: ClientModel) {
        if (!value) return true; // Allow blank
        if (!model.effectiveDate) return true;
        return dayjs(value as string).isAfter(dayjs(model.effectiveDate));
      },
      message: 'Termination date must be after effective date',
    },
  },
};
```

### Custom Validator with Multiple Conditions

```typescript
validations = {
  ssn: {
    custom: [
      {
        validation(key: string, value: unknown) {
          if (!value) return true;
          return /^\d{3}-\d{2}-\d{4}$/.test(value as string);
        },
        message: 'SSN must be format XXX-XX-XXXX',
      },
      {
        validation(key: string, value: unknown) {
          if (!value) return true;
          const digits = (value as string).replace(/-/g, '');
          return digits !== '000000000' && digits !== '123456789';
        },
        message: 'SSN is not valid',
      },
    ],
  },
};
```

## Conditional Validation

Skip a validation depending on model state:

```typescript
validations = {
  terminationDate: {
    presence: {
      if(key: string, value: unknown, model: ClientModel) {
        return model.status === 'terminated';
      },
      message: 'Termination date is required for terminated clients',
    },
  },
  cobraEndDate: {
    presence: {
      unless(key: string, value: unknown, model: ClientModel) {
        return model.status !== 'cobra';
      },
    },
  },
};
```

## Triggering Validation

### validate() Method

Call `validate()` on the model to run all validations and populate the errors object:

```typescript
saveTask = task(async () => {
  const isValid = this.args.model.validate();

  if (!isValid) {
    this.flashMessages.danger(this.intl.t('messages.validationFailed'));
    return;
  }

  try {
    await this.args.model.save();
    this.flashMessages.success(this.intl.t('messages.saved'));
  } catch (error) {
    this.flashMessages.danger(this.intl.t('messages.saveFailed'));
  }
}).drop();
```

### Validating Specific Fields

```typescript
// Validate only specific fields
this.args.model.validate({ only: ['firstName', 'lastName', 'email'] });

// Validate all except specific fields
this.args.model.validate({ except: ['ssn'] });
```

## Error Object

After `validate()` runs, errors are stored on the model's `errors` property (inherited from Ember Data):

```typescript
// Check if model has any errors
this.args.model.get('errors.length'); // number
this.args.model.get('isValid');       // boolean

// Get errors for a specific field
this.args.model.get('errors.firstName');
// => [{ attribute: 'firstName', message: "can't be blank" }]

// Check if a specific field has errors
this.args.model.get('errors.firstName.length') > 0;
```

## Displaying Errors in Templates

### Inline Field Errors

```gts
<template>
  <div class="mb-3 {{if (get @model.errors 'firstName.length') 'has-error'}}">
    <label for="firstName">First Name</label>
    <input
      type="text"
      id="firstName"
      class="form-control {{if (get @model.errors 'firstName.length') 'is-invalid'}}"
      value={{@model.firstName}}
      {{on "input" (fn this.updateField 'firstName')}}
    />
    {{#each (get @model.errors 'firstName') as |error|}}
      <div class="invalid-feedback d-block">{{error.message}}</div>
    {{/each}}
  </div>
</template>
```

### Using the Design System Form Components

The `@trusted-american/ember` design system form components handle error display automatically when bound to a model:

```gts
<template>
  <Form::Input
    @label="First Name"
    @model={{@model}}
    @field="firstName"
    @errors={{get @model.errors "firstName"}}
  />
</template>
```

### Error Summary at Top of Form

```gts
<template>
  {{#if @model.errors.length}}
    <div class="alert alert-danger" role="alert">
      <h5>Please fix the following errors:</h5>
      <ul class="mb-0">
        {{#each @model.errors as |error|}}
          <li>{{error.attribute}}: {{error.message}}</li>
        {{/each}}
      </ul>
    </div>
  {{/if}}
</template>
```

## i18n Integration with ember-intl

Use translation keys for error messages to support internationalization:

```typescript
import { type IntlService } from 'ember-intl';

// In the model or component
validations = {
  firstName: {
    presence: { message: 'validations.presence' }, // Uses i18n key
  },
};
```

Or handle messages in the component layer:

```typescript
get firstNameError(): string | undefined {
  const errors = this.args.model.get('errors.firstName');
  if (errors?.length) {
    return this.intl.t(`validations.${errors[0].message}`, {
      field: this.intl.t('fields.firstName'),
    });
  }
  return undefined;
}
```

## Common A3 Validation Patterns

### Enrollment Model Validations

```typescript
validations = {
  effectiveDate: { presence: true },
  tier: {
    presence: true,
    inclusion: { in: ['employee', 'employee-spouse', 'employee-child', 'family'] },
  },
  planId: { presence: { message: 'A plan must be selected' } },
  premium: {
    presence: true,
    numericality: { greaterThan: 0 },
  },
};
```

### User Model Validations

```typescript
validations = {
  email: {
    presence: true,
    format: { with: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Must be a valid email' },
  },
  firstName: { presence: true, length: { minimum: 1, maximum: 50 } },
  lastName: { presence: true, length: { minimum: 1, maximum: 50 } },
  role: {
    presence: true,
    inclusion: { in: ['admin', 'manager', 'agent', 'viewer'] },
  },
};
```

## Clearing Errors

Errors persist on the model until `validate()` runs again or you manually clear them:

```typescript
// Clear all errors
this.args.model.get('errors').clear();

// Clear errors for a specific field
this.args.model.get('errors').remove('firstName');

// rollbackAttributes also clears errors
this.args.model.rollbackAttributes();
```

## Further Investigation

- **ember-model-validator**: https://github.com/esbanarango/ember-model-validator
- **Ember Data Errors**: https://api.emberjs.com/ember-data/release/classes/Errors
