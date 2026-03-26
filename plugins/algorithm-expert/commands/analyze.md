---
description: Analyze a codebase for algorithmic bottlenecks, suboptimal data structures, and optimization opportunities — produces a prioritized report with complexity analysis and recommended replacements
argument-hint: [file-or-directory-path] [--focus=sorting|search|graph|memory|concurrency]
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Bash
---

You are orchestrating a comprehensive algorithmic analysis of a codebase. The goal is to find every place where a better algorithm or data structure would meaningfully improve performance, scalability, or correctness.

**Input parsing:**
Parse `$ARGUMENTS`: the first token is a file path or directory to analyze (defaults to `./src` or `./` if not provided). An optional `--focus` flag narrows the analysis to a specific domain.

---

## Phase 1: Codebase Profiling

Read the codebase to understand its scope before deep analysis.

1. **Discover the project structure** — use Glob to map all source files by language
2. **Identify the tech stack** — read package.json, requirements.txt, go.mod, Cargo.toml, etc.
3. **Estimate scale** — count files, lines, and identify the largest/most complex modules
4. **Detect hot paths** — look for:
   - Loop-heavy code (nested loops, recursion)
   - Data processing pipelines (ETL, batch operations, stream processing)
   - Search and filter operations (database queries, in-memory search)
   - Sorting and ordering operations
   - Graph traversals (dependency resolution, tree walking, network analysis)
   - String processing (parsing, matching, transformation)
   - Mathematical computations (statistics, ML, financial calculations)
   - Caching and memoization patterns (or lack thereof)
   - Concurrent/parallel operations (or sequential code that should be parallel)

Store a structured profile of the codebase before proceeding.

---

## Phase 2: Parallel Deep Analysis

Spawn 3 agents in parallel:

### Agent A: complexity-analyzer
Provide this agent with:
- The codebase profile from Phase 1
- The file paths of the top 20 most complex files (by size, nesting depth, or cyclomatic complexity)
- The focus area (if `--focus` was specified)
- **Instruction: analyze every function for time and space complexity, return a structured report**

This agent performs Big-O analysis on every significant function, identifies nested loops, recursive calls without memoization, and O(n^2) or worse patterns hiding in innocent-looking code.

### Agent B: pattern-matcher
Provide this agent with:
- The codebase profile from Phase 1
- All source files
- **Instruction: identify algorithmic anti-patterns and map them to superior alternatives**

This agent recognizes patterns like:
- Linear search where binary search or hash lookup applies
- Bubble/insertion sort where quicksort/mergesort/radix applies
- Repeated full-collection scans where indexing or caching applies
- Brute-force where dynamic programming or greedy applies
- Naive string matching where KMP/Rabin-Karp/Aho-Corasick applies
- Adjacency matrix where adjacency list (or vice versa) is better
- Array where Set/Map/heap/trie would be more efficient
- Sequential where concurrent/parallel is safe and faster
- Eager computation where lazy evaluation would reduce work

### Agent C: data-structure-auditor
Provide this agent with:
- The codebase profile from Phase 1
- All source files with collection/container usage
- **Instruction: audit every data structure choice and recommend optimal replacements**

This agent evaluates:
- Array vs. linked list vs. deque usage patterns
- Object/Map choice (HashMap vs. TreeMap vs. trie vs. Bloom filter)
- Set implementations (HashSet vs. TreeSet vs. BitSet)
- Queue/stack/priority queue appropriateness
- Tree structures (BST vs. AVL vs. Red-Black vs. B-tree vs. segment tree)
- Graph representations (adjacency list vs. matrix vs. edge list)
- Custom data structures that should use standard library equivalents
- Missing caches/memos where repeated computation occurs

**Wait for all 3 agents to complete.**

---

## Phase 3: Research Phase (Conditional)

If Phase 2 reveals problems that could benefit from cutting-edge algorithms:

Launch the **algorithm-researcher** agent with:
- The specific problem domains identified (e.g., "approximate nearest neighbor search", "concurrent priority queue")
- **Instruction: research the latest algorithms for these specific problems, return recommendations with citations**

This finds modern algorithms that may not be in the agents' training data — recent papers, new library implementations, emerging approaches.

---

## Phase 4: Prioritization & Report

Merge all findings and produce a prioritized optimization report.

### Scoring Formula
For each optimization opportunity, score on:
- **Impact** (1-10): How much does this improve performance? (10 = order-of-magnitude speedup)
- **Frequency** (1-10): How often is this code path executed? (10 = every request, 1 = once at startup)
- **Effort** (1-10, inverted): How easy is the fix? (10 = drop-in replacement, 1 = major refactor)
- **Risk** (1-10, inverted): How safe is the change? (10 = no behavior change, 1 = subtle correctness risk)

**Priority score** = Impact × Frequency × Effort × Risk (max 10,000)

### Write the Report

Write to `.algorithm-expert/analysis-report.md`:

```markdown
# Algorithm Analysis Report

## Summary
- Files analyzed: [count]
- Functions analyzed: [count]
- Optimization opportunities found: [count]
- Estimated aggregate improvement: [qualitative assessment]

## Critical Optimizations (Score > 5000)
### [Optimization Name]
- **File**: [path:line]
- **Current**: [description + complexity]
- **Proposed**: [algorithm/data structure + complexity]
- **Impact**: [what improves and by how much]
- **Implementation**: [specific code change description]
- **Score**: [Impact × Frequency × Effort × Risk]

## High-Value Optimizations (Score 2000-5000)
[same format]

## Medium-Value Optimizations (Score 500-2000)
[same format]

## Low-Value Optimizations (Score < 500)
[same format]

## Complexity Inventory
| Function | File | Time | Space | Notes |
|----------|------|------|-------|-------|
| [name] | [path:line] | O(?) | O(?) | [note] |

## Data Structure Audit
| Location | Current | Recommended | Why |
|----------|---------|-------------|-----|
| [path:line] | [structure] | [structure] | [reason] |

## Research Findings
[If Phase 3 ran, include algorithm recommendations with citations]
```

Present the user with the top 5 highest-priority optimizations and the total count.

---

## Critical Rules

- Analyze REAL complexity, not just superficial patterns — an O(n) loop inside an O(log n) binary search is O(n), not O(n log n)
- Account for constant factors — O(n) with a huge constant can be worse than O(n log n) for practical input sizes
- Consider the ACTUAL data size — O(n^2) on a 10-element array doesn't need optimization
- Don't recommend premature optimization — only flag issues on hot paths or with large data
- Always preserve correctness — no algorithm change should alter observable behavior
- Language-specific awareness — know that Python dicts are hashmaps, JS arrays are dynamic, Go slices have capacity, Rust has ownership constraints
