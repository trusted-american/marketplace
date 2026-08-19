## 7. Template Syntax (GTS/GJS)

### 7.1 Conditionals

```gts
{{#if this.isLoading}}
  <LoadingSpinner />
{{else if this.hasError}}
  <ErrorMessage @error={{this.error}} />
{{else if this.isEmpty}}
  <EmptyState @message="No items found" />
{{else}}
  <ItemList @items={{@model}} />
{{/if}}

{{#unless this.isVisible}}
  <p>This content is hidden</p>
{{/unless}}

{{! Inline conditionals }}
<div class={{if this.isActive "active" "inactive"}}>...</div>
<div class="btn {{unless this.isEnabled "disabled"}}">...</div>
```

### 7.2 Iteration

```gts
{{#each @items as |item index|}}
  <div class="item" data-index={{index}}>
    {{item.name}}
  </div>
{{else}}
  <p>No items to display.</p>
{{/each}}

{{! Iterating over object keys }}
{{#each-in @record as |key value|}}
  <dt>{{key}}</dt>
  <dd>{{value}}</dd>
{{/each-in}}
```

### 7.3 Yielding (Block Components)

```gts
// Card component
<template>
  <div class="card" ...attributes>
    {{yield this.api}}
  </div>
</template>

// Usage
<Card as |api|>
  <p>{{api.title}}</p>
</Card>
```

### 7.4 Named Blocks

```gts
// Component definition with named blocks
<template>
  <div class="card">
    {{#if (has-block "header")}}
      <div class="card-header">{{yield to="header"}}</div>
    {{/if}}
    <div class="card-body">{{yield to="body"}}</div>
    {{#if (has-block "footer")}}
      <div class="card-footer">{{yield to="footer"}}</div>
    {{/if}}
  </div>
</template>

// Usage
<Card>
  <:header>My Title</:header>
  <:body>My Content</:body>
  <:footer>
    <button type="button">Save</button>
  </:footer>
</Card>
```

### 7.5 Splattributes

```gts
<template>
  <div class="my-component" ...attributes>
    {{! ...attributes spreads all HTML attributes from the invocation site }}
    {{! Invocation: <MyComponent class="extra" data-test-id="foo" /> }}
    {{! Result: <div class="my-component extra" data-test-id="foo"> }}
  </div>
</template>
```

### 7.6 Built-in Helpers

```gts
{{concat "Hello" " " "World"}}               {{! String concatenation }}
{{if condition "yes" "no"}}                   {{! Inline conditional }}
{{unless condition "fallback"}}               {{! Inline unless }}
{{fn this.method arg1 arg2}}                  {{! Partial application }}
{{hash key1="value1" key2="value2"}}          {{! Create POJO }}
{{array "a" "b" "c"}}                         {{! Create array }}
{{get @model "propertyName"}}                 {{! Dynamic property access }}
{{let (helper-result) as |localVar|}}         {{! Local variable binding }}
{{unique-id}}                                 {{! Generate unique DOM id }}
{{yield}}                                     {{! Yield to block }}
{{yield to="named"}}                          {{! Yield to named block }}
{{has-block "name"}}                          {{! Check if named block provided }}
{{has-block-params "name"}}                   {{! Check if block expects params }}
{{in-element this.destinationElement}}        {{! Render into a different DOM node }}
{{#in-element this.el insertBefore=null}}...{{/in-element}}
```

### 7.7 ember-truth-helpers

```gts
{{and a b}}                    {{! Logical AND }}
{{or a b}}                     {{! Logical OR }}
{{not a}}                      {{! Logical NOT }}
{{eq a b}}                     {{! Strict equality }}
{{not-eq a b}}                 {{! Strict inequality }}
{{gt a b}}                     {{! Greater than }}
{{gte a b}}                    {{! Greater than or equal }}
{{lt a b}}                     {{! Less than }}
{{lte a b}}                    {{! Less than or equal }}
{{is-array value}}             {{! Check if array }}
{{is-empty value}}             {{! Check if empty }}
{{is-equal a b}}               {{! Deep equality }}
```

---
