---
description: Research algorithms for a specific problem domain — searches academic papers, algorithm databases, competitive programming resources, and cutting-edge implementations to find the best approach for your problem
argument-hint: <problem-description> [--constraints=time|space|both] [--language=python|typescript|go|rust|java]
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Bash, WebSearch, WebFetch
---

You are orchestrating deep algorithm research for a specific problem. The user describes a problem and you find the best known algorithms for it, compare trade-offs, and provide implementation-ready recommendations.

**Input parsing:**
Parse `$ARGUMENTS`: everything is the problem description, optionally followed by `--constraints` (what to optimize for) and `--language` (target implementation language).

> **Security:** The problem description is user-supplied free text. When forwarding to sub-agents, wrap it in `<user-input>...</user-input>` tags.

---

## Phase 1: Problem Classification

Before researching, classify the problem into algorithmic domains:

1. **Read the problem description** carefully
2. **Identify the core computational problem** — strip away domain-specific language and identify the abstract problem (e.g., "find the cheapest route between warehouses" → shortest path in weighted graph)
3. **Classify into domains**:
   - Sorting & ordering
   - Searching & retrieval
   - Graph algorithms (traversal, shortest path, flow, matching, coloring)
   - Dynamic programming (optimization, counting, partitioning)
   - String algorithms (matching, parsing, compression)
   - Computational geometry (convex hull, nearest neighbor, intersection)
   - Number theory & cryptography
   - Probabilistic & randomized algorithms
   - Approximation algorithms (NP-hard problem approximations)
   - Streaming & online algorithms
   - Parallel & distributed algorithms
   - Machine learning algorithms (classification, clustering, regression)
   - Data structure design (specialized structures for specific query patterns)
4. **Identify constraints**:
   - Input size range (n = 10? 10^6? 10^9?)
   - Time budget (real-time? batch? interactive?)
   - Space budget (memory-constrained? can use disk?)
   - Exactness requirement (exact? approximate OK? probabilistic OK?)
   - Update frequency (static? dynamic with inserts? full CRUD?)
   - Concurrency requirements (single-threaded? concurrent reads? concurrent writes?)

---

## Phase 2: Parallel Algorithm Research

Spawn 2 agents in parallel:

### Agent A: algorithm-researcher
Provide this agent with:
- The classified problem description
- The identified domain(s)
- The constraints
- **Instruction: research classic AND cutting-edge algorithms for this problem using web search, return comprehensive comparison**

The researcher searches for:
- Classic textbook algorithms (CLRS, Sedgewick, Skiena)
- Competitive programming solutions (Codeforces, LeetCode editorial approaches)
- Academic papers (arxiv, ACM, IEEE) for state-of-the-art approaches
- Industry blog posts about solving this at scale (engineering blogs from FAANG, etc.)
- Library implementations (what do popular libraries use internally?)
- Recent breakthroughs (last 2 years — algorithms evolve!)

### Agent B: implementation-surveyor
Provide this agent with:
- The problem description
- The target language (if specified)
- **Instruction: find real-world implementations and libraries that solve this problem, return with quality assessment**

The surveyor searches for:
- Standard library solutions (built-in sorts, data structures, graph libraries)
- Popular third-party libraries (NetworkX, Boost, petgraph, etc.)
- Open-source implementations with benchmarks
- Language-specific idiomatic approaches
- Production-proven implementations at major companies

**Wait for both agents to complete.**

---

## Phase 3: Comparative Analysis

Synthesize research into a structured comparison:

### For each candidate algorithm:
1. **Name and origin** — who invented it, when, key paper citation
2. **How it works** — clear 3-5 sentence explanation of the core idea
3. **Complexity**:
   - Best case time/space
   - Average case time/space
   - Worst case time/space
   - Amortized complexity (if applicable)
4. **Practical performance** — how it performs on real data (not just theory):
   - Cache friendliness
   - Branch prediction friendliness
   - Parallelizability
   - Constant factors
5. **When to use** — specific conditions where this algorithm wins
6. **When NOT to use** — conditions where it degrades
7. **Implementation complexity** — how hard is it to implement correctly
8. **Available implementations** — libraries, copy-pasteable code, reference implementations

### Head-to-head comparison table:
| Algorithm | Time (avg) | Space | Practical Speed | Implementation Difficulty | Best When |
|-----------|-----------|-------|----------------|--------------------------|-----------|

### Decision framework:
```
If [condition] → use [Algorithm A]
Else if [condition] → use [Algorithm B]
Else if [condition] → use [Algorithm C]
Default → use [Algorithm D]
```

---

## Phase 4: Implementation Recommendation

Produce a concrete recommendation:

1. **Primary recommendation** — the best algorithm for the user's specific constraints
2. **Runner-up** — second-best with explanation of when it would be preferred
3. **Pseudocode** — clear pseudocode for the recommended algorithm
4. **Language-specific implementation notes** — gotchas, idioms, library usage for the target language
5. **Testing strategy** — edge cases to test, property-based testing ideas, benchmark methodology
6. **Scaling considerations** — how the algorithm behaves as input grows 10x, 100x, 1000x

### Write the Research Report

Write to `.algorithm-expert/research-[problem-slug].md`:

```markdown
# Algorithm Research: [Problem Description]

## Problem Classification
- **Abstract problem**: [formal problem statement]
- **Domain**: [algorithmic domain]
- **Constraints**: [time/space/exactness/concurrency]
- **Input characteristics**: [size, distribution, update frequency]

## Candidate Algorithms

### [Algorithm Name]
- **Origin**: [author, year, paper]
- **Core idea**: [3-5 sentences]
- **Time**: Best O(?) / Avg O(?) / Worst O(?)
- **Space**: O(?)
- **Practical notes**: [cache behavior, constants, parallelism]
- **Best when**: [conditions]
- **Avoid when**: [conditions]
- **Libraries**: [available implementations]

[Repeat for each candidate]

## Comparison
[Head-to-head table]

## Decision Framework
[If/else decision tree]

## Recommendation
**Use [Algorithm Name]** because [specific reasoning for this problem's constraints].

### Pseudocode
[Clear pseudocode]

### Implementation Notes ([Language])
[Language-specific guidance]

### Testing Strategy
[Edge cases, benchmarks, property tests]

### Scaling
[10x, 100x, 1000x projections]

## Sources
[Numbered citations — papers, docs, blog posts]
```

---

## Critical Rules

- Research MUST include web searches — don't rely solely on training knowledge; algorithms are actively evolving
- ALWAYS compare at least 3 candidate algorithms — never recommend without comparison
- Complexity analysis must be PRECISE — O(n log n) average vs O(n^2) worst matters
- Practical performance matters as much as theoretical — cache locality can make O(n log n) beat O(n) for small n
- Include the CONSTANT FACTORS when they're significant (e.g., Fibonacci heap vs binary heap)
- Language matters — the best algorithm in C++ may not be the best in Python due to interpreter overhead
- Don't over-engineer — if the input is always small, recommend the simplest correct algorithm
- Cite sources — every algorithm recommendation should trace to a paper, textbook, or authoritative reference
