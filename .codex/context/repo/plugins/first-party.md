# First-Party Plugins

## `plugins/a3-plugin`
- Purpose: full-stack implementation copilot for the private A3 insurance platform
- Shape: many commands, many specialist agents, many skill packs, multiple templates
- Key use: grounded implementation across Ember, Firebase/Firestore, GCP Cloud Functions, and tests
- Constraint: requires authenticated GitHub access to `trusted-american/a3`

## `plugins/playwright`
- Purpose: multi-agent Playwright test generation
- Shape: one command (`create-tests`), five agents, one skill, one template
- Key use: generate and review production-ready `.spec.ts` files from a page path plus edge cases
- Guardrail: output is test code only; source code should not be modified

## Practical Routing
- For marketplace mechanics, read the plugin files plus `../conventions.md`
- For feature work inside a plugin, read that plugin's own `README.md` first
