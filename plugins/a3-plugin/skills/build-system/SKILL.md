---
name: build-system
description: A3 build system reference — Embroider, Vite, Babel, TypeScript, route splitting, PWA support, and build configuration
version: 0.1.0
---

# A3 Build System Reference

## Stack

| Tool | Purpose |
|------|---------|
| Vite 7 | Dev server & bundler |
| Embroider 4 | Ember-to-Vite bridge |
| Babel | JavaScript/TypeScript transformation |
| TypeScript 5 | Type checking |
| Tailwind via @tailwindcss/vite | CSS processing |
| VitePWA | Progressive Web App support |

## Vite Configuration

```javascript
// vite.config.mjs
import { defineConfig } from 'vite';
import { embroider } from '@embroider/vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    embroider(),
    tailwindcss(),
    VitePWA({ /* PWA config */ }),
  ],
});
```

## Embroider (Ember Build System)

Embroider is the modern build pipeline that converts Ember apps to standard Vite/webpack builds.

### Key Features Used
- **Route splitting**: Admin, authenticated, and login routes are lazy-loaded
- **Tree shaking**: Unused code is removed from production builds
- **Static analysis**: Templates are compiled statically for better optimization

### Route Splitting
```javascript
// ember-cli-build.js
const app = new EmberApp(defaults, {
  // Embroider configuration
});

return require('@embroider/compat').compatBuild(app, {
  splitAtRoutes: ['admin', 'authenticated', 'login'],
});
```

This means:
- `/admin/*` routes load their own JS bundle
- `/a3/*` (authenticated) routes load their own JS bundle
- `/login` routes load their own JS bundle
- Faster initial page load — only loads what's needed

## TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "declaration": true,
    "declarationDir": "declarations",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": false
  },
  "include": ["app/**/*", "types/**/*", "tests/**/*"]
}
```

### Key TypeScript Settings
- `strict: true` — Full strict mode
- `experimentalDecorators: true` — Required for Ember decorators
- `moduleResolution: "bundler"` — Modern module resolution

## Babel Configuration

```javascript
// babel.config.cjs
module.exports = {
  plugins: [
    ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
    '@babel/plugin-transform-runtime',
    'decorator-transforms',
    'babel-plugin-ember-template-compilation',
  ],
};
```

### Key Plugins
- **decorator-transforms**: Handles @tracked, @action, @service decorators
- **ember-template-compilation**: Compiles GTS/GJS templates

## PWA Support

Via `vite-plugin-pwa`, A3 can work as a Progressive Web App:
- Service worker for offline support
- App manifest for install-to-home-screen
- Cache strategies for assets

## Code Quality Tools

### ESLint (v9)
```javascript
// eslint.config.mjs
import ember from 'eslint-plugin-ember';
import typescript from 'typescript-eslint';

export default [
  ...ember.configs['recommended'],
  ...typescript.configs['recommended'],
  { rules: { /* custom rules */ } },
];
```

### Prettier
```javascript
// .prettierrc.mjs
export default {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
};
```

### Stylelint
```javascript
// .stylelintrc.cjs
module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-tailwindcss',
  ],
};
```

### Template Lint
```javascript
// .template-lintrc.mjs
export default {
  extends: 'recommended',
  rules: { /* custom template rules */ },
};
```

## Development Commands

| Command | Purpose |
|---------|---------|
| `ember serve` / `vite dev` | Start dev server |
| `ember test` | Run tests |
| `ember build --environment production` | Production build |
| `firebase emulators:start` | Start Firebase emulator |
| `firebase deploy --only functions` | Deploy Cloud Functions |
| `firebase deploy --only firestore:rules` | Deploy Firestore rules |

## Further Investigation

- **Embroider**: https://github.com/embroider-build/embroider
- **Vite**: https://vitejs.dev/
- **VitePWA**: https://vite-pwa-org.netlify.app/
