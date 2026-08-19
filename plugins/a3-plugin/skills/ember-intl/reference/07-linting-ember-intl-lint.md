## 6. Linting (`@ember-intl/lint`)

### 6.1 What It Checks

The intl linter validates the consistency between your translation files and your code:

- **Missing translations**: Keys used in templates/JS (`{{t "some.key"}}` or `this.intl.t('some.key')`) that do not exist in translation files
- **Unused translations**: Keys defined in translation files that are never referenced in any template or JS file
- **Inconsistent keys across locales**: Keys that exist in one locale file but not another
- **ICU syntax errors**: Malformed ICU MessageFormat patterns (unclosed braces, invalid plural categories, etc.)

### 6.2 A3's Lint Script

A3 includes a lint script in `package.json`:

```bash
# Run intl linting
npm run lint:intl

# Or using the tool directly
npx ember-intl-lint
```

### 6.3 Common Lint Commands

```bash
# Check for missing and unused translations
npx ember-intl-lint

# Auto-fix: remove unused translations from YAML files
npx ember-intl-lint --fix

# Check a specific locale
npx ember-intl-lint --locale en-us

# Output format options
npx ember-intl-lint --format json
npx ember-intl-lint --format stylish
```

### 6.4 Handling Dynamic Keys

The linter cannot detect dynamic keys (keys constructed at runtime). You may need to mark them as used:

```typescript
// The linter will NOT detect this usage:
this.intl.t(`enrollments.status.${status}`);

// You may need an ember-intl-lint ignore comment or a whitelist configuration
```

For dynamic keys, add them to the lint configuration's whitelist or use inline ignore comments as documented by the linter.

---
