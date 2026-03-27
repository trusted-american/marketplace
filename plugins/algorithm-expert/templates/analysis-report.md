---
name: analysis-report
description: Template for the codebase algorithm analysis report — prioritized optimization opportunities with complexity analysis, data structure audit, and pattern matching results
---

# Algorithm Analysis Report: {{ProjectName}}

> Analysis date: {{date}} | Files analyzed: {{fileCount}} | Functions analyzed: {{functionCount}}

---

## Summary

| Metric | Value |
|--------|-------|
| Optimization opportunities | {{totalOpportunities}} |
| Critical (score > 5000) | {{criticalCount}} |
| High-value (2000-5000) | {{highCount}} |
| Medium-value (500-2000) | {{mediumCount}} |
| Low-value (< 500) | {{lowCount}} |
| Worst complexity found | O({{worstComplexity}}) in {{worstFunction}} |

## Critical Optimizations

### {{OPT-ID}}: {{OptimizationName}}
- **File**: {{path}}:{{line}}
- **Current**: {{currentAlgorithm}} — O({{currentTime}}) time, O({{currentSpace}}) space
- **Proposed**: {{proposedAlgorithm}} — O({{proposedTime}}) time, O({{proposedSpace}}) space
- **Impact**: {{impactDescription}}
- **Score**: {{impact}} x {{frequency}} x {{effort}} x {{risk}} = {{score}}
- **Implementation**: {{implementationDescription}}

## Complexity Inventory

| Function | File | Time | Space | Hot Path | Bottleneck |
|----------|------|------|-------|----------|-----------|
| {{functionName}} | {{path}}:{{line}} | O({{time}}) | O({{space}}) | {{yes/no}} | {{yes/no}} |

## Data Structure Audit

| Location | Current | Recommended | Operation | Before | After |
|----------|---------|-------------|-----------|--------|-------|
| {{path}}:{{line}} | {{currentDS}} | {{recommendedDS}} | {{operation}} | O({{before}}) | O({{after}}) |

## Anti-Pattern Summary

| Pattern | Count | Worst Location | Fix |
|---------|-------|---------------|-----|
| {{patternName}} | {{count}} | {{path}}:{{line}} | {{briefFix}} |
