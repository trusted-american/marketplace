## 8. Advanced Patterns

### 8.1 HTML in Translations

When translations need to contain HTML markup:

```yaml
terms: "By submitting, you agree to our <a href=\"/terms\">Terms of Service</a>."
emphasis: "This action is <strong>irreversible</strong>."
richMessage: "Your enrollment for <em>{planName}</em> has been submitted."
```

```gts
<template>
  {{t "terms" htmlSafe=true}}
  {{t "emphasis" htmlSafe=true}}
  {{t "richMessage" planName=@enrollment.planName htmlSafe=true}}
</template>
```

IMPORTANT: Never put user-provided content into an htmlSafe translation. If the translation contains user data, sanitize it first or use a component-based approach (see next section).

### 8.2 Translations with Components (Wrapping Translated Text in Links)

When you need interactive elements (links, buttons) within translated text, use a component-based approach rather than HTML in translations:

#### Approach 1: Split the translation around the link

```yaml
termsPrefix: "By submitting, you agree to our "
termsLink: "Terms of Service"
termsSuffix: "."
```

```gts
<template>
  {{t "termsPrefix"}}<a href="/terms">{{t "termsLink"}}</a>{{t "termsSuffix"}}
</template>
```

#### Approach 2: Use htmlSafe with a URL parameter

```yaml
termsAgreement: "By submitting, you agree to our <a href=\"{termsUrl}\">Terms of Service</a>."
```

```gts
<template>
  {{t "termsAgreement" termsUrl="/terms" htmlSafe=true}}
</template>
```

#### Approach 3: Use a placeholder pattern and replace after translation

```yaml
contactSupport: "If the issue persists, please {contactLink}."
contactLinkText: "contact support"
```

```gts
<template>
  {{! Build the full message with a component }}
  If the issue persists, please <LinkTo @route="support">{{t "contactLinkText"}}</LinkTo>.
</template>
```

### 8.3 Dynamic Translation Keys (Computed Key Names)

When the translation key depends on a runtime value:

```typescript
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export default class StatusLabel extends Component<{ Args: { status: string } }> {
  @service declare intl: IntlService;

  get label() {
    const key = `enrollments.status.${this.args.status}`;

    // Always check existence when using dynamic keys
    if (this.intl.exists(key)) {
      return this.intl.t(key);
    }

    // Fallback: capitalize the raw status string
    return this.args.status.charAt(0).toUpperCase() + this.args.status.slice(1);
  }
}
```

In templates using `concat`:

```gts
import { t } from 'ember-intl';
import { concat } from '@ember/helper';

<template>
  {{! Simple dynamic key }}
  {{t (concat "enrollments.status." @status)}}

  {{! Dynamic feature + field }}
  {{t (concat @featureName ".fields." @fieldName)}}

  {{! Dynamic action button }}
  {{t (concat "buttons." @actionName)}}
</template>
```

Common patterns for dynamic keys in A3:
- Status labels: `[feature].status.[statusValue]`
- Column headers: `[feature].fields.[fieldName]`
- Tab labels: `[feature].tabs.[tabName]`
- Filter labels: `[feature].filters.[filterName]`

### 8.4 Lazy Loading Translations

For large applications, you can load translations on demand rather than bundling all locales upfront:

```typescript
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export default class ApplicationRoute extends Route {
  @service declare intl: IntlService;

  async beforeModel() {
    const locale = this.determineLocale();

    // Load translations dynamically
    const translations = await fetch(`/translations/${locale}.json`).then((r) =>
      r.json()
    );

    this.intl.addTranslations(locale, translations);
    this.intl.setLocale([locale]);
  }

  determineLocale() {
    return localStorage.getItem('locale') || navigator.language || 'en-us';
  }
}
```

You can also add translations incrementally (e.g., per-route translations for code splitting):

```typescript
// In a feature route
async model() {
  // Load feature-specific translations
  const translations = await fetch('/translations/enrollments-en-us.json').then(
    (r) => r.json()
  );
  this.intl.addTranslations('en-us', translations);
}
```

### 8.5 Testing with Intl

#### Setting Locale in Tests

```typescript
import { setupIntl } from 'ember-intl/test-support';

module('Integration | Component | enrollment-card', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'en-us');

  test('it renders the enrollment title', async function (assert) {
    await render(hbs`<EnrollmentCard />`);
    assert.dom('h1').hasText('Enrollments');
  });
});
```

#### Testing with a Specific Locale

```typescript
module('Integration | Component | enrollment-card (Spanish)', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'es');

  test('it renders in Spanish', async function (assert) {
    await render(hbs`<EnrollmentCard />`);
    assert.dom('h1').hasText('Inscripciones');
  });
});
```

#### Adding Test-Specific Translations

```typescript
import { setupIntl, addTranslations } from 'ember-intl/test-support';

module('Integration | Component | my-component', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'en-us');

  test('it uses custom translations', async function (assert) {
    addTranslations('en-us', {
      test: {
        greeting: 'Hello, {name}!',
      },
    });

    this.set('name', 'World');
    await render(hbs`{{t "test.greeting" name=this.name}}`);
    assert.dom().hasText('Hello, World!');
  });
});
```

#### Asserting Translated Text

```typescript
test('it shows the correct count', async function (assert) {
  this.set('items', [1, 2, 3]);
  await render(hbs`<span>{{t "enrollments.count" count=this.items.length}}</span>`);
  assert.dom('span').hasText('3 enrollments');
});

test('it shows empty state', async function (assert) {
  this.set('items', []);
  await render(hbs`<span>{{t "enrollments.count" count=this.items.length}}</span>`);
  assert.dom('span').hasText('No enrollments');
});

test('it shows singular', async function (assert) {
  this.set('items', [1]);
  await render(hbs`<span>{{t "enrollments.count" count=this.items.length}}</span>`);
  assert.dom('span').hasText('1 enrollment');
});
```

#### Testing Flash Messages with Intl

```typescript
test('it shows success message on save', async function (assert) {
  await render(hbs`<EnrollmentForm @model={{this.model}} />`);
  await click('[data-test-save]');

  // Assert the flash message contains the translated text
  assert.dom('.flash-message.success').hasText('Record saved successfully');
});
```

#### Testing Format Helpers

```typescript
test('it formats currency correctly', async function (assert) {
  this.set('amount', 1234.56);
  await render(hbs`{{format-number this.amount style="currency" currency="USD"}}`);
  assert.dom().hasText('$1,234.56');
});

test('it formats dates correctly', async function (assert) {
  this.set('date', new Date('2026-03-26'));
  await render(hbs`{{format-date this.date dateStyle="medium"}}`);
  assert.dom().hasText('Mar 26, 2026');
});
```

---
