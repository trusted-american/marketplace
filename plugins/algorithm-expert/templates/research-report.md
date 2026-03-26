---
name: research-report
description: Template for algorithm research results — candidate algorithms with complexity analysis, trade-offs, implementation options, and recommendations for a specific computational problem
---

# Algorithm Research: {{ProblemDescription}}

> Research date: {{date}} | Candidates evaluated: {{candidateCount}}

---

## Problem Classification
- **Abstract problem**: {{formalStatement}}
- **Domain**: {{algorithmicDomain}}
- **Input characteristics**: n = {{inputSize}}, {{distribution}}
- **Constraints**: Time {{timeBudget}} / Space {{spaceBudget}} / Exactness {{exact/approximate}}
- **Known lower bound**: Ω({{lowerBound}})

## Candidate Algorithms

### {{AlgorithmName}}
- **Origin**: {{authors}}, {{year}}
- **Core idea**: {{explanation}}
- **Time**: Best O({{best}}) / Avg O({{avg}}) / Worst O({{worst}})
- **Space**: O({{space}})
- **Cache behavior**: {{friendly/neutral/unfriendly}}
- **Parallelizable**: {{yes/partially/no}}
- **Implementation difficulty**: {{easy/moderate/hard}}
- **Available in**: {{libraries}}
- **Best when**: {{conditions}}
- **Avoid when**: {{limitations}}

## Comparison

| Algorithm | Time (avg) | Space | Practical Speed | Impl. Difficulty | Best When |
|-----------|-----------|-------|----------------|-----------------|-----------|
| {{name}} | O({{time}}) | O({{space}}) | {{fast/moderate/slow}} | {{easy/moderate/hard}} | {{conditions}} |

## Decision Framework

```
{{ifElseDecisionTree}}
```

## Recommendation
**Primary**: {{algorithm}} — {{justification}}
**Alternative**: {{algorithm}} — {{whenToUse}}

## Sources
{{numberedSources}}
