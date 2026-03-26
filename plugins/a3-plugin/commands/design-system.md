---
description: Standalone TAIA design system specialist — use design system components, check compliance, and get advice on @trusted-american/ember usage in A3
argument-hint: <component-need-or-question>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /design-system Command

Standalone entry point for the design-system-writer specialist. Use this when working with TAIA design system components, checking compliance, or needing advice on which components to use.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Behavior

1. **Understand the request**: Which design system components are needed, or is this a compliance check?
2. **Check the design system repo**: Read component sources at `~/Desktop/design-system/packages/ember/addon/components/`
3. **Ask clarifying questions** if needed:
   - What UI element are you building?
   - Is this a form, data display, navigation, or layout task?
   - Are there existing A3 pages that look similar?
4. **Spawn design-system-writer agent** with full context
5. **Recommend components**: Map the UI need to specific design system components
6. **Check for compliance**: If reviewing existing code, identify raw HTML that should use design system components
7. **Deliver**: Present component usage with correct imports and args

## Quick Reference

### Form Needs
| Need | Component |
|------|-----------|
| Text input | `<Form::Input>` |
| Select dropdown | `<Form::Select>` or `<Form::PowerSelect>` |
| Textarea | `<Form::Textarea>` |
| Checkbox | `<Form::Check>` |
| Radio buttons | `<Form::Radio>` + `<Form::RadioButton>` |
| Date picker | `<Form::DateInput>` |
| Phone input | `<Form::PhoneInput>` |
| Number input | `<Form::NumberInput>` |
| File upload | `<Form::FileInput>` or `<Form::FileDropzone>` |
| Rich text | `<Form::HtmlInput>` (TipTap) |
| Markdown | `<Form::MarkdownInput>` |
| Multi-select | `<Form::PowerSelectMultiple>` |

### Display Needs
| Need | Component |
|------|-----------|
| Status label | `<Badge @color="...">` |
| Alert message | `<Alert @color="...">` |
| Action button | `<Button @color="...">` |
| Data card | `<Card>` + sub-components |
| Stat/metric | `<StatCard @label="..." @value="...">` |
| Empty state | `<Placeholder @icon="..." @message="...">` |
| Loading | `<Spinner>` or `<Skeleton>` |
| Notification | `<Toast>` or `<Banner>` |

### Layout Needs
| Need | Component |
|------|-----------|
| App frame | `<Frame>` |
| Sidebar | `<Aside>` + sub-components |
| Main content | `<Main>` + sub-components |
| Detail view | `<PropertyList>` + items |
| Tabs | `<Nav>` + `<Nav::Item>` |
| Breadcrumbs | `<BreadcrumbTrail>` |
| Accordion | `<Accordion>` + sub-components |
| Modal dialog | `<Modal @isOpen=... @title="...">` |
| Dropdown menu | `<Dropdown>` + sub-components |
| Flyout panel | `<Flyout>` |
