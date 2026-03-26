---
description: Orchestrate full-ticket implementation across the A3 stack — gathers requirements, delegates to specialists, coordinates round-robin review until unanimous approval
argument-hint: <task-description>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent
---

# /orchestrate Command

This is the master command for implementing complete A3 features. It orchestrates the full development lifecycle from requirements gathering through round-robin review.

## Step 0: Authentication Gate

Run this FIRST before anything else:

```bash
gh api repos/trusted-american/a3 --jq '.full_name' 2>/dev/null
```

If this returns empty or errors, STOP immediately and tell the user:
> "Access denied. This plugin requires authenticated GitHub access to trusted-american/a3. Run `gh auth login` and ensure you have repo access."

Do NOT proceed past this step without successful authentication.

## Step 1: Requirements Gathering

You MUST ask the user extensive questions before writing any code. This is NOT optional.

### Mandatory Questions:

**Scope:**
1. What is the feature/bug/task in detail?
2. Which sections of A3 does this affect? (admin, authenticated, public?)
3. Is there a Jira ticket or issue number?
4. Are there mockups, designs, or wireframes?

**Data Layer:**
5. Are new Firestore collections needed? What fields and types?
6. Are there relationships to existing models? Which ones?
7. Do we need subcollections (files, notes, activities)?
8. Are there computed properties or derived data?

**Permissions:**
9. Who can access this? (admin only, all authenticated users, specific roles?)
10. Are there ownership-based permissions? (users can only see their own data?)
11. Do Firestore rules need updating?

**Frontend:**
12. Where does this live in the navigation? (route path)
13. Are there new components needed? Describe the UI.
14. Should this use existing components from A3? Which ones look similar?
15. Are there query params for filtering/searching?
16. Does it need internationalization for any new strings?

**Backend:**
17. Are Cloud Functions needed? (triggers, HTTPS endpoints, PubSub?)
18. Does this integrate with external services? (Stripe, Mailgun, PandaDoc, Algolia, etc.)
19. Are there background jobs or async processes?

**Testing:**
20. What are the critical user flows to test?
21. Are there edge cases to specifically cover?
22. Are there permission scenarios to test?

**Context:**
23. Are there similar features in A3 to use as reference?
24. Is there existing code to modify vs. new code to create?

Wait for answers. Ask follow-up questions if any answer is vague or incomplete. Do NOT proceed to implementation until you are confident you understand the full scope.

## Step 2: Codebase Investigation

Before delegating to agents, investigate the A3 codebase yourself:

1. **Find similar patterns**: Search for existing features that resemble this task
2. **Read related files**: Models, routes, components that this feature will interact with
3. **Check conventions**: Verify current patterns for the areas being modified
4. **Identify dependencies**: What existing code will the new feature depend on?
5. **Map the route**: Determine the exact route path and hierarchy

Compile findings into a context document that all agents will receive.

## Step 3: Task Decomposition & Agent Delegation

Break the task into work items and spawn agents in dependency order:

### Layer 1: Foundation (run first)
Spawn **model-writer** agent with:
- Full requirements
- Existing model patterns for reference
- Firestore collection design
- Relationship mapping

### Layer 2: Backend (after models exist, run in parallel)
Spawn **function-writer** agent with:
- Function requirements (triggers, endpoints)
- Model definitions from Layer 1
- External service integration details

Spawn **ability-writer** agent with:
- Permission requirements
- Existing ability patterns
- Firestore rules context

### Layer 3: Frontend (after models & permissions exist, run in parallel)
Spawn **route-writer** agent with:
- Route hierarchy and paths
- Model types for route hooks
- Navigation structure

Spawn **component-writer** agent with:
- UI requirements and designs
- Available data from routes
- Existing component patterns to reuse

### Layer 4: Integration (after all pieces exist)
Spawn **integration-specialist** agent with:
- ALL code produced by Layers 1-3
- Integration map for the feature
- Known integration concerns

### Layer 5: Testing (after implementation is complete)
Spawn **test-writer** agent with:
- ALL code produced by Layers 1-4
- Test scenarios from requirements
- Edge cases to cover

## Step 4: Round-Robin Review

After ALL agents complete their work, initiate the round-robin review protocol.

### Review Rotation:
Each agent reviews ALL other agents' output from their specialty perspective:

1. **model-writer** reviews all code for data layer correctness
2. **function-writer** reviews all code for backend integration correctness
3. **ability-writer** reviews all code for security and permission correctness
4. **route-writer** reviews all code for routing and navigation correctness
5. **component-writer** reviews all code for UI and UX correctness
6. **integration-specialist** reviews ALL code for cross-concern integration
7. **test-writer** reviews ALL code for testability and test coverage
8. **code-reviewer** performs final holistic review

### Review Iteration Protocol:

Each reviewer provides a verdict: **APPROVE**, **REQUEST_CHANGES**, or **BLOCK**

```
Round N:
├── Agent A reviews → APPROVE
├── Agent B reviews → REQUEST_CHANGES (lists specific fixes)
├── Agent C reviews → APPROVE
├── ...
└── Agent H reviews → APPROVE

If any agent is not APPROVE:
  1. Responsible agent implements the requested changes
  2. Requesting agent re-reviews the fix
  3. All other agents confirm the fix doesn't break their domain
  4. Proceed to Round N+1
```

**Continue iterating until ALL agents vote APPROVE.**

Maximum 5 rounds. If not resolved after 5 rounds, present all findings to the user and ask for direction.

### Acceptance Criteria:
- **ALL 8 agents must APPROVE** (zero tolerance)
- No unresolved BLOCK verdicts
- No unresolved REQUEST_CHANGES verdicts
- code-reviewer's holistic review passes all 6 dimensions

## Step 5: Delivery

Once all agents approve:

1. **Present file manifest** — List every file created/modified with a one-line description
2. **Show change summary** — Organized by domain (models, routes, components, functions, tests, rules)
3. **List manual steps** — Any actions the user needs to take:
   - Firestore index creation
   - Environment variable configuration
   - External service setup (webhooks, API keys)
   - Router updates
   - Translation file additions
4. **Confirm test results** — All tests should pass
5. **Write files** — After user confirmation, write all files to the A3 repository

## Critical Rules

- NEVER skip requirements gathering. The more you know, the better the code.
- NEVER let an agent's code through without unanimous review approval.
- ALWAYS investigate existing A3 code before generating new code.
- ALWAYS prefer GTS route templates over controllers unless filtering/query params are needed.
- The integration-specialist is the most important reviewer — prioritize their findings.
- If ANY agent is uncertain about something, investigate the codebase before proceeding.
- Present the full review findings transparently to the user.
