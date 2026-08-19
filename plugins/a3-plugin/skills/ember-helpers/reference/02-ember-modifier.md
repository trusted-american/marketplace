## @ember/modifier

### `on` — DOM Event Listener Modifier

**Import:** `import { on } from '@ember/modifier';`

**Template signature:**
```hbs
<element {{on "eventName" this.handler}} />
<element {{on "eventName" (fn this.handler arg)}} />
```

**What it does:** Attaches a DOM event listener to the element. The listener is automatically
removed when the element is destroyed. This is the standard way to handle DOM events in
modern Ember / Glimmer templates.

**Supported events (commonly used in A3):**
- Mouse: `click`, `dblclick`, `mousedown`, `mouseup`, `mouseenter`, `mouseleave`, `mousemove`
- Keyboard: `keydown`, `keyup`, `keypress`
- Form: `input`, `change`, `submit`, `focus`, `blur`, `focusin`, `focusout`
- Touch: `touchstart`, `touchmove`, `touchend`
- Drag: `dragstart`, `dragover`, `dragend`, `drop`
- Scroll: `scroll`
- Clipboard: `copy`, `paste`

**A3 patterns:**

Basic click handler:
```gts
import { on } from '@ember/modifier';

<template>
  <button {{on "click" @onClick}} type="button">
    {{@label}}
  </button>
</template>
```

Form submission with prevention:
```gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';

export default class MyForm extends Component {
  handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    // process form
  };

  <template>
    <form {{on "submit" this.handleSubmit}}>
      {{yield}}
      <button type="submit">Save</button>
    </form>
  </template>
}
```

Keyboard shortcuts:
```gts
<template>
  <div {{on "keydown" this.handleKeyDown}} tabindex="0">
    {{yield}}
  </div>
</template>
```

Multiple events on the same element:
```gts
<template>
  <div
    {{on "mouseenter" this.showTooltip}}
    {{on "mouseleave" this.hideTooltip}}
    {{on "focus" this.showTooltip}}
    {{on "blur" this.hideTooltip}}
  >
    {{@content}}
  </div>
</template>
```

**Event modifier options:**
The `on` modifier accepts an options hash as the third argument:
```hbs
{{on "click" this.handler capture=true}}
{{on "scroll" this.handleScroll passive=true}}
{{on "click" this.handler once=true}}
```

**Common mistakes:**
- Using `{{action}}` modifier instead of `{{on}}` — `action` is legacy, always use `on`.
- Forgetting `event.preventDefault()` on form submits and link clicks.
- Not using `passive: true` on scroll/touch handlers, which hurts performance.

---
