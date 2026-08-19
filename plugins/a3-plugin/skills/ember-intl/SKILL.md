---
name: ember-intl
description: ember-intl internationalization reference — translation keys, ICU message format, pluralization, date/number formatting, and A3 i18n conventions
version: 0.1.0
---


# ember-intl Reference

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-icu-message-format-exhaustive-reference.md` | 1. ICU Message Format (Exhaustive Reference) |
| `reference/03-template-helpers-exhaustive-reference.md` | 2. Template Helpers (Exhaustive Reference) |
| `reference/04-translation-file-organization-in-a3.md` | 3. Translation File Organization in A3 |
| `reference/05-programmatic-api-javascript-typescript.md` | 4. Programmatic API (JavaScript/TypeScript) |
| `reference/06-locale-management.md` | 5. Locale Management |
| `reference/07-linting-ember-intl-lint.md` | 6. Linting (`@ember-intl/lint`) |
| `reference/08-common-a3-patterns.md` | 7. Common A3 Patterns |
| `reference/09-advanced-patterns.md` | 8. Advanced Patterns |
| `reference/10-quick-reference-card.md` | Quick Reference Card |

## Overview

A3 uses ember-intl v8 for internationalization. This is the single most imported package in the entire A3 codebase, used across 855+ files. All user-facing strings MUST use translation keys — never hardcoded English text. ember-intl implements the ICU MessageFormat standard, providing pluralization, gender-aware text, number/date/time formatting, and rich argument interpolation.

The package provides:
- Template helpers (`{{t}}`, `{{format-number}}`, `{{format-date}}`, `{{format-time}}`, `{{format-relative}}`, `{{format-list}}`)
- A programmatic JavaScript/TypeScript API via the `intl` service
- ICU MessageFormat parsing for complex message patterns
- YAML-based translation file management
- Locale-aware formatting for numbers, dates, times, and relative time

---
## Further Investigation

- **ember-intl Docs**: https://ember-intl.github.io/ember-intl/
- **ICU Message Format**: https://unicode-org.github.io/icu/userguide/format_parse/messages/
- **ECMA-402 Intl API**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
- **Unicode CLDR Plural Rules**: https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
- **ICU Number Skeletons**: https://unicode-org.github.io/icu/userguide/format_parse/numbers/skeletons.html
