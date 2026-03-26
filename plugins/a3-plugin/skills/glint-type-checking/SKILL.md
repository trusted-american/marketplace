---
name: glint-type-checking
description: Glint template type-checking reference — @glint/template, @glint/ember-tsc, @glint/tsserver-plugin for type-safe GTS templates in A3
version: 0.1.0
---

# Glint Template Type-Checking Reference

## Overview

Glint provides TypeScript-powered type checking for Ember's GTS templates. A3 uses three Glint packages:
- `@glint/template` v1.7.2 — Template type primitives
- `@glint/ember-tsc` v1.0.7 — CLI type checker (`ember-tsc --noEmit`)
- `@glint/tsserver-plugin` v2.0.8 — IDE integration (autocomplete, errors in templates)

## What Glint Does

Without Glint, TypeScript only checks `.ts` files — templates are invisible to the type system. Glint extends TypeScript to understand GTS template syntax:

- Validates component args match the `Signature` interface
- Catches typos in `@argName` references
- Enforces helper/modifier type signatures
- Provides autocomplete for args, yields, and component invocations
- Reports errors inline in VS Code via the tsserver plugin

## Component Signatures (The Foundation)

Every typed component defines a `Signature` interface that Glint enforces:

```typescript
interface MyComponentSignature {
  // Args: what the caller passes as @argName
  Args: {
    name: string;           // Required — Glint errors if caller omits this
    count?: number;         // Optional — ? means caller can omit
    onSave: () => void;     // Function arg — Glint checks the type
  };

  // Blocks: what {{yield}} passes to the caller
  Blocks: {
    default: [item: MyModel, index: number];  // Positional params yielded
    header: [];                                // Named block, no params
    empty: [];                                 // Named block for empty state
  };

  // Element: the root element type for ...attributes
  Element: HTMLDivElement;  // Glint checks that HTML attrs match this element
}
```

### Signature Enforcement Examples

```gts
// Component definition
export default class UserCard extends Component<UserCardSignature> {
  <template>
    <div ...attributes>        {{! Glint knows this is HTMLDivElement }}
      {{@name}}                {{! Glint knows this is string }}
      {{@count}}               {{! Glint knows this is number | undefined }}
      {{yield @someData 0}}    {{! Glint checks yield matches Blocks.default }}
    </div>
  </template>
}

// Usage — Glint catches errors at compile time:
<UserCard @name="John" />                  {{! OK — count is optional }}
<UserCard @name={{42}} />                  {{! ERROR: number not assignable to string }}
<UserCard />                               {{! ERROR: missing required arg @name }}
<UserCard @name="John" @typo="x" />        {{! ERROR: @typo not in Args }}
```

## Template-Only Components

Template-only components (no class) use module-level type annotations:

```gts
import type { TOC } from '@ember/component/template-only';

interface Signature {
  Args: { label: string; color?: string };
  Element: HTMLSpanElement;
}

const Badge: TOC<Signature> = <template>
  <span class="badge bg-{{@color}}" ...attributes>
    {{@label}}
  </span>
</template>;

export default Badge;
```

## Typing Helpers

```typescript
import type { HelperLike } from '@glint/template';

// For helpers imported in templates:
type FormatDateHelper = HelperLike<{
  Args: { Positional: [date: Date]; Named: { format?: string } };
  Return: string;
}>;
```

## Typing Modifiers

```typescript
import type { ModifierLike } from '@glint/template';

type TooltipModifier = ModifierLike<{
  Args: {
    Positional: [text: string];
    Named: { placement?: 'top' | 'bottom' | 'left' | 'right' };
  };
  Element: HTMLElement;
}>;
```

## Registry Augmentation

For addons that don't ship Glint types, augment the registry:

```typescript
// types/glint.d.ts
import type { HelperLike, ComponentLike } from '@glint/template';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    // Register a helper
    t: HelperLike<{ Args: { Positional: [key: string]; Named: Record<string, unknown> }; Return: string }>;

    // Register a component
    FaIcon: ComponentLike<{ Args: { icon: string; prefix?: string }; Element: SVGElement }>;

    // Register a modifier
    on: ModifierLike<{ Args: { Positional: [event: string, handler: Function] }; Element: Element }>;
  }
}
```

## CLI Usage

```bash
# Type-check all templates + TypeScript
ember-tsc --noEmit

# A3's lint:types script runs this:
pnpm lint:types  # → ember-tsc --noEmit
```

## IDE Integration

The `@glint/tsserver-plugin` integrates with VS Code's TypeScript language service:

1. Install the plugin (already in A3's devDependencies)
2. In `tsconfig.json`, the plugin is configured:
```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@glint/tsserver-plugin" }]
  }
}
```
3. VS Code shows:
   - Red squiggles on invalid `@args` in templates
   - Autocomplete for `@args`, `this.properties`, and component names
   - Hover info showing types of template expressions
   - Go-to-definition from template to component class

## Common Glint Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Property '@foo' does not exist on Args` | Typo or missing arg in signature | Add to `Args` interface or fix the typo |
| `Expected 1 argument, but got 0` | Required arg not passed | Pass the arg or make it optional with `?` |
| `Type 'number' is not assignable to 'string'` | Wrong arg type | Fix the value or update the signature |
| `Block ':default' yields 2 values but only 1 consumed` | yield/block arity mismatch | Update the Blocks signature or the yield |
| `Element does not have attribute 'xyz'` | ...attributes on wrong element type | Fix the Element type in signature |

## Further Investigation

- **Glint Docs**: https://typed-ember.gitbook.io/glint/
- **Glint GitHub**: https://github.com/typed-ember/glint
- **RFC**: https://rfcs.emberjs.com/id/0800-glint/
