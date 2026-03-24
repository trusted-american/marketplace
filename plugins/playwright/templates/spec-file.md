---
name: spec-file
description: Output template for generated Playwright spec files
---

# Spec File Template

Generated test files MUST follow this structure:

```typescript
import { test, expect } from '@playwright/test';

test.describe('{{PageName}}', () => {
  test.beforeEach(async ({ page }) => {
    // Common setup — navigate to the page under test
    await page.goto('{{pageRoute}}');
  });

  // ── Core Functionality ────────────────────────────────────────────

  test('should render initial state correctly', async ({ page }) => {
    // Verify the page loads with expected elements
  });

  // ── User Interactions ─────────────────────────────────────────────

  test('should handle {{interaction}} correctly', async ({ page }) => {
    // Act — perform the user action
    // Assert — verify the expected outcome
  });

  // ── Edge Cases ────────────────────────────────────────────────────

  test('should handle {{edgeCase}}', async ({ page }) => {
    // Setup — mock specific conditions
    // Act — trigger the edge case
    // Assert — verify graceful handling
  });

  // ── Error States ──────────────────────────────────────────────────

  test('should display error on API failure', async ({ page }) => {
    await page.route('**/api/{{endpoint}}', route =>
      route.fulfill({ status: 500, json: { error: 'Server error' } })
    );
    // Assert — verify error UI appears
  });

  // ── Loading States ────────────────────────────────────────────────

  test('should show loading indicator during fetch', async ({ page }) => {
    await page.route('**/api/{{endpoint}}', async route => {
      await new Promise(r => setTimeout(r, 100));
      await route.fulfill({ json: {{mockResponse}} });
    });
    // Assert — verify loading indicator shown then hidden
  });
});
```

## Template Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `{{PageName}}` | Page component name | PascalCase describe block label |
| `{{pageRoute}}` | Project routing config | Route path for `page.goto()` |
| `{{interaction}}` | Edge cases input | User interaction under test |
| `{{edgeCase}}` | Edge cases input | Specific edge case scenario |
| `{{endpoint}}` | Page API dependencies | API endpoint to mock |
| `{{mockResponse}}` | API response shape | JSON mock data |

## Section Ordering

1. Core functionality (render, navigation)
2. User interactions (clicks, form input, keyboard)
3. Edge cases (from user input + discovered)
4. Error states (API failures, network errors)
5. Loading states (slow responses, skeleton UI)
6. Accessibility (keyboard nav, screen reader)
