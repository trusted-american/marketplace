# Playwright Plugin Preferences

To configure this plugin's defaults for your project, create a file at `.claude/playwright.local.md` in your project root with YAML frontmatter.

## Configuration Template

Copy this into `.claude/playwright.local.md` and customize:

```markdown
---
baseURL: "http://localhost:3000"
browsers:
  - chromium
timeout: 30000
viewport:
  width: 1280
  height: 720
auth:
  setupFile: "tests/auth.setup.ts"
  storageState: "tests/.auth/user.json"
outputDir: "tests/e2e"
namingPattern: "{page-name}.spec.ts"
---

## Project-Specific Testing Notes

Add any project-specific context here that the test generator should know about:
- Authentication flow details
- API endpoint patterns
- Custom component naming conventions
- Known limitations or quirks
```

## Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `baseURL` | string | `http://localhost:3000` | Base URL for `page.goto()` |
| `browsers` | string[] | `["chromium"]` | Browsers to target |
| `timeout` | number | `30000` | Default test timeout (ms) |
| `viewport.width` | number | `1280` | Viewport width |
| `viewport.height` | number | `720` | Viewport height |
| `auth.setupFile` | string | — | Path to auth setup file |
| `auth.storageState` | string | — | Path to stored auth state |
| `outputDir` | string | `tests/e2e` | Where spec files are created |
| `namingPattern` | string | `{page-name}.spec.ts` | Spec file naming pattern |
