---
name: playwright-testing
description: This skill should be used when writing Playwright tests, creating test suites, debugging flaky tests, choosing selectors, mocking API responses, setting up test fixtures, or following Playwright best practices. Triggers on "playwright test", "e2e test", "end-to-end test", "spec file", "page object", "test fixture", "flaky test", "playwright selector", "playwright mock", "playwright assertion".
version: 0.1.0
---

# Playwright Testing Best Practices

## Selectors — Priority Order

Always prefer accessible selectors. In order of preference:

1. `page.getByRole('button', { name: 'Submit' })` — best, mirrors user intent
2. `page.getByLabel('Email address')` — great for form inputs
3. `page.getByText('Welcome back')` — good for static text
4. `page.getByPlaceholder('Enter email')` — acceptable for inputs
5. `page.getByTestId('submit-btn')` — fallback when no semantic option exists

Never use:
- `page.locator('.css-class')` — breaks on styling changes
- `page.locator('div > span:nth-child(2)')` — extremely fragile
- `page.locator('#generated-id')` — breaks on framework changes

## Waiting Strategy

Never use `waitForTimeout`. Always use condition-based waits:

```typescript
// Wait for element
await expect(page.getByRole('heading')).toBeVisible();

// Wait for navigation
await page.waitForURL('**/dashboard');

// Wait for API response
const responsePromise = page.waitForResponse('**/api/data');
await page.getByRole('button', { name: 'Load' }).click();
await responsePromise;

// Wait for network idle after action
await page.getByRole('button', { name: 'Submit' }).click();
await page.waitForLoadState('networkidle');
```

## Mocking Network Requests

Use `page.route()` for API mocking:

```typescript
// Mock success response
await page.route('**/api/users', route =>
  route.fulfill({ json: [{ id: 1, name: 'Test User' }] })
);

// Mock error response
await page.route('**/api/users', route =>
  route.fulfill({ status: 500, json: { error: 'Server error' } })
);

// Mock network failure
await page.route('**/api/users', route => route.abort());

// Mock slow response
await page.route('**/api/users', async route => {
  await new Promise(resolve => setTimeout(resolve, 3000));
  await route.fulfill({ json: [] });
});
```

## Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feature-page');
  });

  test('should display initial state correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Feature' })).toBeVisible();
  });

  test('should handle user interaction', async ({ page }) => {
    await page.getByRole('button', { name: 'Action' }).click();
    await expect(page.getByText('Result')).toBeVisible();
  });
});
```

## Test Independence Rules

- Every test gets a fresh `page` via the fixture — never share page state
- Use `test.beforeEach` for common navigation, not for shared data setup
- If tests need specific data state, mock it per-test with `page.route()`
- Never use `test.describe.serial` unless tests truly cannot be parallelized
- Clean up any created resources in `test.afterEach`

## Assertions — Use Specific Matchers

```typescript
// URL assertions
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveTitle('Dashboard');

// Element visibility
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();
await expect(locator).not.toBeVisible();

// Element state
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();
await expect(locator).toBeChecked();
await expect(locator).toHaveAttribute('aria-expanded', 'true');

// Text content
await expect(locator).toHaveText('exact text');
await expect(locator).toContainText('partial text');

// Count
await expect(locator).toHaveCount(5);

// Input values
await expect(locator).toHaveValue('input value');
```

## Common Test Patterns

### Form Validation
```typescript
test('should show validation errors for empty required fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Email is required')).toBeVisible();
  await expect(page.getByText('Password is required')).toBeVisible();
});
```

### Loading States
```typescript
test('should show loading indicator during data fetch', async ({ page }) => {
  await page.route('**/api/data', async route => {
    await new Promise(r => setTimeout(r, 100));
    await route.fulfill({ json: { items: [] } });
  });
  await page.goto('/page');
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.getByRole('progressbar')).toBeHidden();
});
```

### Error States
```typescript
test('should display error message on API failure', async ({ page }) => {
  await page.route('**/api/data', route =>
    route.fulfill({ status: 500, json: { error: 'Internal Server Error' } })
  );
  await page.goto('/page');
  await expect(page.getByRole('alert')).toContainText('Something went wrong');
});
```

### Authentication Gates
```typescript
test('should redirect to login when not authenticated', async ({ page }) => {
  await page.goto('/protected-page');
  await expect(page).toHaveURL(/.*login/);
});
```
