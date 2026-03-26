---
name: fidelity-scorecard
description: Template for the final fidelity scorecard — the certification document showing how faithfully the built system reproduces the original after all healing passes
---

# Fidelity Scorecard: {{SoftwareName}}

> Final assessment: {{date}} | Healing passes: {{healingPasses}}/3

---

## Final Fidelity Score: {{finalScore}}/100

| Status | Threshold | Result |
|--------|-----------|--------|
| {{CERTIFIED/NEEDS_WORK/BLOCKED}} | {{threshold}}% | {{finalScore}}% |

## Score Journey

| Stage | Score | Delta | Notes |
|-------|-------|-------|-------|
| Initial build | {{initialScore}} | — | Post Phase 4 |
| First drift detection | {{driftScore}} | {{delta}} | Phase 5 baseline |
| Healing pass 1 | {{heal1Score}} | +{{delta}} | {{itemsFixed}} items fixed |
| Healing pass 2 | {{heal2Score}} | +{{delta}} | {{itemsFixed}} items fixed |
| Healing pass 3 | {{heal3Score}} | +{{delta}} | {{itemsFixed}} items fixed |

## Dimension Scores (Final)

### Feature Completeness: {{featureScore}}/100 (30% weight)
| Priority | Implemented | Total | Rate |
|----------|------------|-------|------|
| P0 Critical | {{p0Done}} | {{p0Total}} | {{p0Rate}}% |
| P1 Core | {{p1Done}} | {{p1Total}} | {{p1Rate}}% |
| P2 Enhancement | {{p2Done}} | {{p2Total}} | {{p2Rate}}% |
| P3 Nice-to-have | {{p3Done}} | {{p3Total}} | {{p3Rate}}% |

### Architecture Fidelity: {{archScore}}/100 (20% weight)
- Component mapping: {{componentRate}}%
- Data flow accuracy: {{flowRate}}%
- Technology alignment: {{techRate}}%
- Pattern adherence: {{patternRate}}%

### API Surface Parity: {{apiScore}}/100 (15% weight)
- Endpoints implemented: {{endpointCount}}/{{endpointTotal}}
- Request shape match: {{requestRate}}%
- Response shape match: {{responseRate}}%
- Error contract match: {{errorRate}}%

### UI Component Coverage: {{uiScore}}/100 (15% weight)
- Components implemented: {{componentCount}}/{{componentTotal}}
- Interaction fidelity: {{interactionRate}}%
- Responsive behavior: {{responsiveRate}}%

### Data Model Accuracy: {{dataScore}}/100 (10% weight)
- Entities: {{entityCount}}/{{entityTotal}}
- Fields: {{fieldCount}}/{{fieldTotal}}
- Relationships: {{relCount}}/{{relTotal}}
- Indexes: {{indexCount}}/{{indexTotal}}

### Behavioral Correctness: {{behaviorScore}}/100 (10% weight)
- User flows verified: {{flowCount}}/{{flowTotal}}
- State transitions correct: {{stateRate}}%
- Error handling match: {{errorHandlingRate}}%

## Remaining Drift Items

### Unresolved ({{unresolvedCount}})
| ID | Severity | Feature | Reason Unresolved |
|----|----------|---------|-------------------|
| {{driftID}} | {{severity}} | {{feature}} | {{reason}} |

### Accepted Divergences ({{acceptedCount}})
| ID | Feature | Divergence | Justification |
|----|---------|-----------|---------------|
| {{driftID}} | {{feature}} | {{divergence}} | {{justification}} |

## Competitive Advantage Analysis
| Area | Original | Clone | Winner | Notes |
|------|----------|-------|--------|-------|
| {{area}} | {{originalApproach}} | {{cloneApproach}} | {{winner}} | {{notes}} |

## Build Statistics

| Metric | Value |
|--------|-------|
| Total build phases | {{phaseCount}} |
| Total tasks executed | {{taskCount}} |
| Features implemented | {{featureCount}} |
| Files created | {{fileCount}} |
| Drift items detected | {{driftCount}} |
| Drift items resolved | {{resolvedCount}} |
| Self-healing passes | {{healingPasses}} |
| Total agent invocations | {{agentCount}} |

## Certification

{{#if certified}}
**CERTIFIED**: This system faithfully reproduces the target software at {{finalScore}}% fidelity, meeting the {{threshold}}% threshold. All P0 and P1 features are implemented. Remaining drift items are LOW severity or accepted divergences.
{{else}}
**NOT CERTIFIED**: This system scores {{finalScore}}% fidelity, below the {{threshold}}% threshold. {{unresolvedCritical}} CRITICAL and {{unresolvedHigh}} HIGH drift items remain. See the unresolved items table for required human intervention.
{{/if}}

---

## Files Generated
- `.reverse-engineer/research-dossier.md` — Complete research findings
- `.reverse-engineer/architecture.md` — Architecture extraction
- `.reverse-engineer/features.md` — Feature catalog
- `.reverse-engineer/blueprint.md` — Implementation blueprint
- `.reverse-engineer/build-log.md` — Phase-by-phase build record
- `.reverse-engineer/drift-report.md` — Detailed drift analysis
- `.reverse-engineer/fidelity-scorecard.md` — This document
- `.reverse-engineer/competitive-analysis.md` — Competitor landscape
