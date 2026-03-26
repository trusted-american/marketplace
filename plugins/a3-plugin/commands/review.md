---
description: Queue ALL specialist agents for round-robin code review of your A3 changes — finds issues across every concern area
argument-hint: [files-or-branch-to-review]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /review Command

Triggers a full round-robin review of code changes using ALL specialist agents. Use this after writing code yourself (without `/orchestrate`) to get expert review across every concern area.

## Authentication Gate

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```
STOP if this fails — user needs GitHub access to trusted-american/a3.

## Step 1: Identify Changes

Determine what code to review:

- If the user specified files: review those files
- If the user specified a branch: run `git diff main...HEAD` to find all changes
- If neither: run `git diff` and `git diff --cached` to find uncommitted changes

Read ALL changed files completely. Build a manifest:
```
Files Changed:
- app/models/referral.ts (new)
- app/routes/authenticated/referrals.ts (new)
- app/templates/authenticated/referrals.gts (new)
- app/components/referral-card.gts (new)
- functions/src/firestore/referrals/create.ts (new)
- firestore.rules (modified)
- tests/unit/models/referral-test.ts (new)
```

## Step 2: Spawn Parallel Review Agents

Spawn ALL specialist agents in parallel, each reviewing from their domain:

1. **model-writer** — Reviews all data layer code (models, adapters, serializers)
2. **route-writer** — Reviews all routing code (routes, templates, controllers)
3. **component-writer** — Reviews all UI code (components, helpers, modifiers)
4. **function-writer** — Reviews all backend code (Cloud Functions)
5. **ability-writer** — Reviews all security code (abilities, Firestore rules)
6. **integration-specialist** — Reviews ALL code for cross-concern integration
7. **test-writer** — Reviews ALL code for test coverage adequacy
8. **code-reviewer** — Holistic review across all dimensions

Each agent receives the complete set of changed files and the context of what they're reviewing.

## Step 3: Collect Verdicts

Aggregate all agent verdicts:

```
Review Summary:
├── model-writer:           APPROVE
├── route-writer:           REQUEST_CHANGES (2 issues)
├── component-writer:       APPROVE
├── function-writer:        APPROVE
├── ability-writer:         BLOCK (security issue)
├── integration-specialist: REQUEST_CHANGES (1 issue)
├── test-writer:            REQUEST_CHANGES (missing tests)
└── code-reviewer:          REQUEST_CHANGES (conventions)

Overall: NOT APPROVED (1 BLOCK, 3 REQUEST_CHANGES)
```

## Step 4: Present Findings

Present ALL findings to the user organized by severity:

### BLOCK (must fix)
- List all blocking issues with file, line, description, and fix

### REQUEST_CHANGES (should fix)
- List all requested changes with file, line, description, and fix

### APPROVE (looks good)
- Brief confirmation of what passed

## Step 5: User Decision

Ask the user:
> "Would you like me to implement these fixes automatically, or would you prefer to fix them yourself?"

If the user wants automatic fixes:
1. Implement all fixes
2. Re-run the review (back to Step 2)
3. Continue until all agents APPROVE

If the user wants to fix themselves:
- Present the specific code changes needed
- Offer to re-review after they make changes

## Critical Rules

- NEVER skip any reviewer — ALL 8 agents must review
- Present findings honestly — don't minimize issues
- BLOCK verdicts cannot be overridden without fixing the issue
- The integration-specialist's findings are especially important
- Always offer to implement fixes — don't just report problems
