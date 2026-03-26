---
name: drift-report
description: Template for the drift detection report — documents every deviation between the built system and the original with severity, category, and fix recommendations
---

# Drift Report: {{SoftwareName}}

> Analysis date: {{date}} | Fidelity score: {{fidelityScore}}/100

---

## Fidelity Score Breakdown

| Dimension | Score | Weight | Weighted Score |
|-----------|-------|--------|----------------|
| Feature completeness | {{featureScore}}/100 | 30% | {{weightedFeature}} |
| Architecture fidelity | {{archScore}}/100 | 20% | {{weightedArch}} |
| API surface parity | {{apiScore}}/100 | 15% | {{weightedAPI}} |
| UI component coverage | {{uiScore}}/100 | 15% | {{weightedUI}} |
| Data model accuracy | {{dataScore}}/100 | 10% | {{weightedData}} |
| Behavioral correctness | {{behaviorScore}}/100 | 10% | {{weightedBehavior}} |
| **Overall** | | | **{{fidelityScore}}/100** |

## Feature Fidelity Matrix

| Feature ID | Feature Name | Priority | Score | Status | Gap Description |
|------------|-------------|----------|-------|--------|-----------------|
| {{featureID}} | {{featureName}} | {{priority}} | {{score}}% | {{COMPLETE/INCOMPLETE/MISSING/DIVERGENT/ENHANCED}} | {{gapDescription}} |

## Drift Items

### DRIFT-{{number}}
- **Severity**: {{CRITICAL/HIGH/MEDIUM/LOW}}
- **Category**: {{MISSING/INCOMPLETE/DIVERGENT/ENHANCED}}
- **Feature**: {{featureID}} — {{featureName}}
- **Description**: {{whatIsDifferent}}
- **Expected behavior**: {{whatOriginalDoes}}
- **Actual behavior**: {{whatCloneDoes}}
- **Fix complexity**: {{Simple/Medium/Complex}}
- **Fix recommendation**: {{specificFixInstructions}}
- **Files affected**: {{filePaths}}

## Summary by Severity

| Severity | Count | Fixable | Blocked |
|----------|-------|---------|---------|
| CRITICAL | {{count}} | {{fixable}} | {{blocked}} |
| HIGH | {{count}} | {{fixable}} | {{blocked}} |
| MEDIUM | {{count}} | {{fixable}} | {{blocked}} |
| LOW | {{count}} | {{fixable}} | {{blocked}} |

## Self-Healer Priority Queue

1. {{DRIFT-ID}}: {{briefDescription}} — {{fixApproach}}
2. {{DRIFT-ID}}: {{briefDescription}} — {{fixApproach}}

## Enhancement Opportunities

| Feature | Enhancement | Benefit |
|---------|------------|---------|
| {{feature}} | {{whatCloneDoesBetter}} | {{userBenefit}} |
