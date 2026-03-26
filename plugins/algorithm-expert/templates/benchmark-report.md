---
name: benchmark-report
description: Template for before/after performance benchmark results — execution time, memory usage, scaling behavior, and statistical analysis for algorithm optimizations
---

# Benchmark Report: {{OptimizationName}}

> Benchmark date: {{date}} | Language: {{language}} {{version}}

---

## Change
- **Before**: {{beforeAlgorithm}} — O({{beforeTime}})
- **After**: {{afterAlgorithm}} — O({{afterTime}})

## Execution Time

| Input Size | Before (mean) | After (mean) | Speedup | Std Dev (before) | Std Dev (after) |
|-----------|--------------|-------------|---------|-----------------|----------------|
| n={{small}} | {{time}} | {{time}} | {{factor}}x | {{sd}} | {{sd}} |
| n={{medium}} | {{time}} | {{time}} | {{factor}}x | {{sd}} | {{sd}} |
| n={{large}} | {{time}} | {{time}} | {{factor}}x | {{sd}} | {{sd}} |
| n={{xlarge}} | {{time}} | {{time}} | {{factor}}x | {{sd}} | {{sd}} |

## Memory Usage

| Input Size | Before | After | Delta |
|-----------|--------|-------|-------|
| n={{medium}} | {{bytes}} | {{bytes}} | {{delta}} |
| n={{large}} | {{bytes}} | {{bytes}} | {{delta}} |

## Scaling Behavior
- **Before**: {{observedBefore}} — doubling n causes {{effect}}
- **After**: {{observedAfter}} — doubling n causes {{effect}}

## Statistical Confidence
- Warm-up runs: {{warmupCount}}
- Measurement runs: {{sampleCount}}
- Distributions clearly separated: {{yes/no}}

## Verdict: {{CONFIRMED_IMPROVEMENT / MARGINAL / NO_CHANGE / REGRESSION}}
