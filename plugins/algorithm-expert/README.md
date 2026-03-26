# Algorithm Expert Plugin

Multi-agent algorithm intelligence system that analyzes codebases for optimization opportunities, researches cutting-edge algorithms, and applies superior data structures and algorithms with before/after benchmarking.

## What It Does

1. **Analyze** — Scans a codebase for algorithmic bottlenecks: O(n^2) hidden in innocent code, wrong data structures for access patterns, missing memoization, suboptimal search/sort, and concurrency anti-patterns
2. **Research** — Searches academic papers, competitive programming resources, engineering blogs, and library documentation to find the best known algorithm for any problem
3. **Apply** — Implements optimizations surgically with full correctness verification, preserving all observable behavior while improving complexity

## Commands

### `/algorithm-expert:analyze [path] [--focus=sorting|search|graph|memory|concurrency]`
Full codebase analysis pipeline:
- Phase 1: Codebase profiling and hot path detection
- Phase 2: Parallel deep analysis (complexity analyzer + pattern matcher + data structure auditor)
- Phase 3: Algorithm research for novel problems (conditional)
- Phase 4: Prioritized report with scoring formula (Impact x Frequency x Effort x Risk)

### `/algorithm-expert:research <problem-description> [--constraints=time|space|both] [--language=py|ts|go|rust|java]`
Deep algorithm research for a specific problem:
- Classifies the problem into algorithmic domains
- Parallel research: classic algorithms + production implementations
- Comparative analysis with complexity trade-offs
- Decision framework and implementation recommendation

### `/algorithm-expert:apply <optimization-id-or-description> [file-path]`
Apply a specific optimization:
- Pre-optimization correctness snapshot
- Surgical algorithm replacement via optimizer agent
- Post-optimization verification (tests + manual trace + complexity confirmation)
- Before/after benchmark report

## Agents (7)

| Agent | Model | Role |
|-------|-------|------|
| **complexity-analyzer** | opus | Big-O analysis of every function, tracing through library calls and hidden costs |
| **pattern-matcher** | opus | Identifies algorithmic anti-patterns and maps to optimal replacements |
| **data-structure-auditor** | sonnet | Audits every collection against its actual access pattern |
| **algorithm-researcher** | opus | 5-layer web research: textbooks, competitive programming, papers, production, emerging |
| **implementation-surveyor** | sonnet | Finds battle-tested libraries and implementations with quality assessment |
| **optimizer** | sonnet | Implements algorithm changes while preserving all behavior contracts |
| **benchmark-runner** | sonnet | Statistically rigorous before/after performance measurement |

## Skill

### `algorithms`
Comprehensive reference covering:
- Big-O complexity classes with practical operation counts
- Sorting algorithms (comparison-based + non-comparison) with decision tree
- Searching algorithms with selection guide
- Graph algorithms (traversal, shortest path, MST, flow, matching)
- Dynamic programming patterns and optimization techniques
- String algorithms (matching, distance, suffix structures)
- Data structure quick reference (linear, hash-based, tree, heap)
- Probabilistic and approximate algorithms (Bloom filter, HLL, MinHash, LSH)
- Parallel and concurrent algorithm patterns
- Algorithm selection framework (5-step decision process)

## Templates (3)

| Template | Purpose |
|----------|---------|
| **analysis-report** | Prioritized optimization opportunities with complexity inventory |
| **research-report** | Algorithm candidates with trade-offs and decision framework |
| **benchmark-report** | Before/after performance measurements with statistical analysis |

## Anti-Patterns Detected

The plugin recognizes 30+ algorithmic anti-patterns including:

**Search**: Linear search in sorted data, repeated linear scans, `.includes()` in loops
**Sorting**: Sort to find min/max, sort to find top-k, re-sorting on insert
**Graph**: BFS for weighted shortest path, adjacency matrix for sparse graphs
**DP**: Recursive without memoization, full DP table when only last row needed
**Data structures**: Array as queue (`.shift()`), array for membership (`.includes()`), string concat in loop
**Concurrency**: Sequential await in loop, unbounded `Promise.all`, polling loops

## Quick Start

```bash
# Analyze your codebase for optimization opportunities
/algorithm-expert:analyze src/

# Research the best algorithm for a specific problem
/algorithm-expert:research "find top-k elements from a stream of 10M items" --constraints=time --language=typescript

# Apply a specific optimization from the analysis report
/algorithm-expert:apply OPT-003
```

## License

MIT
