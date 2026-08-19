## 5. Locale Management

### 5.1 Setting Locale on Boot

The locale is typically set during application initialization. In A3, this happens in the application route or an initializer:

```typescript
// app/routes/application.ts
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export default class ApplicationRoute extends Route {
  @service declare intl: IntlService;

  beforeModel() {
    // Set locale from user preferences, browser, or default
    const savedLocale = localStorage.getItem('locale') || 'en-us';
    this.intl.setLocale([savedLocale]);
  }
}
```

### 5.2 Switching Locale at Runtime

```typescript
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';
import { action } from '@ember/object';

export default class LocaleSwitcher extends Component {
  @service declare intl: IntlService;

  @action
  switchLocale(locale: string) {
    this.intl.setLocale([locale]);
    localStorage.setItem('locale', locale);
    // All {{t}} helpers and format-* helpers will re-render automatically
  }
}
```

When the locale changes, all template helpers that depend on the intl service automatically re-render. No manual refresh is needed.

### 5.3 Fallback Chain Behavior

When you set multiple locales, ember-intl searches for translations in order:

```typescript
this.intl.setLocale(['es-mx', 'es', 'en-us']);
```

Lookup order for `this.intl.t('enrollments.title')`:
1. Look in `es-mx` translations -> if found, use it
2. Look in `es` translations -> if found, use it
3. Look in `en-us` translations -> if found, use it
4. If not found in any locale -> trigger missing translation behavior

This allows you to provide region-specific overrides (e.g., Mexican Spanish) while falling back to generic Spanish and ultimately to English.

### 5.4 Missing Translation Handling

When a translation key is not found in any locale in the fallback chain:

1. **Default behavior**: ember-intl returns a string like `"Missing translation: enrollments.title"` and logs a warning to the console.

2. **Custom missing message handler**: You can configure the intl service to handle missing translations differently:

```typescript
// app/services/intl.ts
import IntlService from 'ember-intl/services/intl';

export default class CustomIntlService extends IntlService {
  onMissingTranslation(key: string, locales: string[]): string {
    // Option 1: Return the key itself
    return key;

    // Option 2: Return a user-friendly fallback
    // return `[${key}]`;

    // Option 3: Report to error tracking
    // Sentry.captureMessage(`Missing translation: ${key}`);
    // return key;
  }
}
```

3. **The `onMissingTranslation` hook** is called every time a translation key is not found, making it useful for logging missing translations during development or reporting them in production.

---
