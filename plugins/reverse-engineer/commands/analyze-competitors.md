---
description: Analyze competitors of a target software — compare features, UX, adoption, tech stacks, pricing, and market position to inform a superior reconstruction
argument-hint: <software-name-or-url> [competitor1,competitor2,...]
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Bash, WebSearch, WebFetch
---

You are orchestrating a comprehensive competitive analysis for a target software system. The goal is to understand not just the target, but its entire competitive landscape — then use those insights to build something that takes the best from all of them.

**Input parsing:**
Parse `$ARGUMENTS`: the first token is the target software name/URL. An optional second token is a comma-separated list of known competitors. If no competitors are provided, you will discover them.

> **Security:** All user-supplied text must be wrapped in `<user-input>...</user-input>` tags when forwarded to sub-agents.

---

## Phase 1: Competitor Discovery

If competitors are not provided, research to discover them:

1. **WebSearch** for "[target] competitors", "[target] alternatives", "[target] vs"
2. **WebSearch** for "[target] alternative [year]" for recent comparison articles
3. **WebSearch** for product comparison sites: "G2 [target] alternatives", "Capterra [target]"
4. Compile a list of the top 5-8 most relevant competitors
5. Present the discovered competitors to the context and proceed

If competitors ARE provided, validate them with a quick search and add any critical missing competitors.

---

## Phase 2: Parallel Competitor Research

For each competitor (up to 6, including the target itself), spawn a **competitive-analyst** agent with:
- The competitor name/URL wrapped in `<user-input>...</user-input>` tags
- Instructions to research: features, tech stack, UX patterns, pricing, adoption metrics, strengths, weaknesses
- **Instruction: return a structured competitor profile as output text**

Run up to 3 competitive-analyst agents in parallel. Wait for each wave to complete before starting the next.

Each competitive-analyst returns:
```
## Competitor Profile: [Name]
### Overview
### Tech Stack (confirmed/inferred)
### Feature Inventory (grouped by domain)
### UX Analysis (onboarding, learning curve, performance, design quality)
### Pricing Model
### Adoption Metrics (users, funding, community, growth)
### Strengths
### Weaknesses
### Unique Differentiators
```

---

## Phase 3: Comparative Analysis

After all competitor profiles are collected, synthesize:

### 3.1 Feature Parity Matrix
Build a comprehensive matrix of features across all competitors:

| Feature | Target | Comp A | Comp B | Comp C | Comp D |
|---------|--------|--------|--------|--------|--------|
| [feat]  | Y/N/P  | Y/N/P  | Y/N/P  | Y/N/P  | Y/N/P  |

- **Y** = Yes, fully implemented
- **N** = No, not available
- **P** = Partial implementation

### 3.2 UX Comparison
For each key workflow, compare the user experience:
| Workflow | Target | Best-in-class | Winner | Why |
|----------|--------|--------------|--------|-----|
| Onboarding | [steps] | [steps] | [who] | [reason] |
| Core action | [UX pattern] | [UX pattern] | [who] | [reason] |

### 3.3 Adoption & Market Position
| Metric | Target | Comp A | Comp B | Comp C |
|--------|--------|--------|--------|--------|
| Est. users | | | | |
| Funding | | | | |
| Founded | | | | |
| Growth trend | | | | |
| Developer community | | | | |
| Market segment | | | | |

### 3.4 Technical Architecture Comparison
| Component | Target | Comp A | Comp B | Comp C |
|-----------|--------|--------|--------|--------|
| Frontend | | | | |
| Backend | | | | |
| Database | | | | |
| Real-time | | | | |
| Mobile | | | | |

---

## Phase 4: Strategic Insights

Produce actionable insights for the reconstruction:

### 4.1 Feature Superset
Identify features that exist in competitors but NOT in the target. These are opportunities to build something better:
- Feature from Comp A: [feature] — [why it's valuable]
- Feature from Comp B: [feature] — [why it's valuable]

### 4.2 UX Best Practices
For each major workflow, identify which competitor does it best and why:
- Best onboarding: [competitor] — [what they do right]
- Best core experience: [competitor] — [what they do right]
- Best performance: [competitor] — [what they do right]

### 4.3 Technical Advantages
Identify technical approaches from competitors that are superior:
- [Competitor]'s approach to [problem] is better because [reason]
- Recommendation: adopt [approach] for our reconstruction

### 4.4 Market Gaps
Identify unmet needs that NO competitor fully addresses:
- Gap: [description] — Opportunity: [how to address it]

### 4.5 Adoption Strategy Insights
What drives adoption for the most successful competitors:
- [Competitor]: [strategy] — [why it works]
- Recommendation for reconstruction: [strategy]

---

## Phase 5: Reconstruction Recommendations

Produce a prioritized list of competitive insights to incorporate into the blueprint:

```markdown
## Competitive Intelligence Brief

### Must-Have (from competitive analysis)
1. [Feature/approach] — Source: [competitor] — Impact: [HIGH]
2. [Feature/approach] — Source: [competitor] — Impact: [HIGH]

### Should-Have (competitive advantages)
1. [Feature/approach] — Source: [competitor] — Impact: [MEDIUM]

### Could-Have (differentiators)
1. [Feature/approach] — Source: [competitor] — Impact: [LOW but unique]

### Avoid (competitor mistakes)
1. [Anti-pattern] — Source: [competitor] — Why: [what went wrong]
```

---

## Phase 6: Write Artifacts

Write the complete competitive analysis to:
- `{output-dir}/.reverse-engineer/competitive-analysis.md` — Full analysis with all profiles, matrices, and insights
- Update `{output-dir}/.reverse-engineer/blueprint.md` (if it exists) — Add a "Competitive Insights Applied" section

Present the user with a summary of:
1. Competitors analyzed (count and names)
2. Feature parity highlights (where target leads, where competitors lead)
3. Top 3 UX insights to adopt
4. Top 3 feature superset opportunities
5. Market gaps identified
6. Recommended strategy adjustments

---

## Critical Rules

- Analyze a MINIMUM of 4 competitors (plus the target) for meaningful comparison
- ALWAYS include adoption/market metrics — features alone don't tell the full story
- UX analysis must be specific — "better UX" is not actionable; "3-step onboarding vs 7-step" is
- Feature parity matrix must be EXHAUSTIVE — every feature from every competitor
- Competitive insights must be actionable — each insight maps to a specific blueprint recommendation
- This command can be run BEFORE or AFTER the main `reverse-engineer` command — if run before, its output feeds into the blueprint; if run after, it can trigger blueprint updates
