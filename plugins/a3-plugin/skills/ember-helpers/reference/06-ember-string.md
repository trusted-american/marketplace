## @ember/string

**Import:** `import { htmlSafe, dasherize, camelize, capitalize, classify, decamelize, underscore, w } from '@ember/string';`

> Note: `@ember/string` is a standalone package in Ember 4.x+. It must be installed separately.

### `htmlSafe`

**Signature:** `htmlSafe(str: string): SafeString`

Marks a string as safe for raw HTML rendering. The template will NOT escape the content.

```ts
import { htmlSafe } from '@ember/string';

get formattedDescription() {
  return htmlSafe(this.args.model.richTextHtml);
}
```

**DANGER:** Never use `htmlSafe` on user-supplied input without sanitization. Always sanitize
with DOMPurify or equivalent first.

A3 pattern for rendering rich text from Firestore:
```ts
import { htmlSafe } from '@ember/string';
import DOMPurify from 'dompurify';

get safeHtml() {
  return htmlSafe(DOMPurify.sanitize(this.args.content));
}
```

### `dasherize`

**Signature:** `dasherize(str: string): string`

Converts camelCase or underscored strings to dash-case.

```ts
dasherize('employeeName');    // "employee-name"
dasherize('employee_name');   // "employee-name"
dasherize('EmployeeName');    // "employee-name"
```

### `camelize`

**Signature:** `camelize(str: string): string`

Converts dash-case or underscored strings to camelCase.

```ts
camelize('employee-name');    // "employeeName"
camelize('employee_name');    // "employeeName"
camelize('Employee name');    // "employeeName"
```

### `capitalize`

**Signature:** `capitalize(str: string): string`

Capitalizes the first letter of a string.

```ts
capitalize('employee');       // "Employee"
capitalize('hello world');    // "Hello world"
```

### `classify`

**Signature:** `classify(str: string): string`

Converts to UpperCamelCase (PascalCase).

```ts
classify('employee-name');    // "EmployeeName"
classify('employee_name');    // "EmployeeName"
classify('employee name');    // "EmployeeName"
```

### `decamelize`

**Signature:** `decamelize(str: string): string`

Converts camelCase to underscore_case.

```ts
decamelize('employeeName');   // "employee_name"
decamelize('innerHTML');      // "inner_html"
```

### `underscore`

**Signature:** `underscore(str: string): string`

Converts any casing to underscore_case.

```ts
underscore('EmployeeName');   // "employee_name"
underscore('employee-name');  // "employee_name"
```

### `w`

**Signature:** `w(str: string): string[]`

Splits a string on whitespace into an array of words.

```ts
w('one two three');           // ["one", "two", "three"]
w('  spaced   out  ');       // ["spaced", "out"]
```

A3 pattern — defining CSS class lists:
```ts
import { w } from '@ember/string';
const STATUS_CLASSES = w('active inactive pending archived');
```

---
