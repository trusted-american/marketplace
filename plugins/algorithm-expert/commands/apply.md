---
description: Apply a specific algorithm optimization to the codebase — replaces a suboptimal algorithm or data structure with a superior one, including before/after benchmarking and correctness verification
argument-hint: <optimization-id-or-description> [file-path]
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Bash
---

You are orchestrating the application of a specific algorithm optimization to a codebase. You take an optimization (identified from an analysis report or described by the user) and implement it safely with verification.

**Input parsing:**
Parse `$ARGUMENTS`: the first token is either an optimization ID from a previous analysis report (e.g., "OPT-003") or a description of the optimization (e.g., "replace linear search in UserService.findUser with hash map lookup"). The optional second token is a file path to target.

---

## Phase 1: Understand the Optimization

1. **If an optimization ID was given**: Read `.algorithm-expert/analysis-report.md` and find the specific optimization
2. **If a description was given**: Read the target file and identify the exact code to optimize
3. **Document the current state**:
   - Current algorithm/data structure in use
   - Current time complexity
   - Current space complexity
   - Exact file(s) and line range(s) affected
   - All callers and dependents of the code being changed
   - Current behavior contract (inputs, outputs, side effects, error handling)
4. **Document the target state**:
   - Proposed algorithm/data structure
   - Target time complexity
   - Target space complexity
   - Expected improvement magnitude

---

## Phase 2: Pre-Optimization Snapshot

Before changing anything, capture the baseline:

### 2.1 Correctness Snapshot
1. Read and document the exact current behavior:
   - Input/output pairs for typical cases
   - Edge cases (empty input, single element, maximum input, null/undefined)
   - Error cases and how they're handled
   - Ordering guarantees (stable sort? deterministic iteration?)
   - Side effects (mutations, events, logging)
2. If tests exist for this code, run them via Bash and record results
3. If no tests exist, note the test gap

### 2.2 Performance Baseline (if measurable)
If the project has benchmarking infrastructure:
1. Run existing benchmarks via Bash and record results
2. If no benchmarks exist but the optimization is significant, create a simple before-benchmark

---

## Phase 3: Implementation

Spawn the **optimizer** agent with:
- The current code (full file context + the specific function/section)
- The proposed algorithm with pseudocode or reference implementation
- The behavior contract (what must be preserved)
- All callers/dependents that might need updating
- The target language's idioms and standard library capabilities
- **Instruction: implement the optimization, preserve all behavior contracts, return the modified code**

The optimizer:
1. Implements the new algorithm/data structure
2. Updates all affected call sites if the interface changes
3. Preserves every aspect of the behavior contract
4. Adds comments explaining the algorithm choice and complexity where non-obvious
5. Uses standard library implementations where available (don't reinvent the wheel)

---

## Phase 4: Verification

After the optimizer returns, perform comprehensive verification:

### 4.1 Correctness Verification
1. **Read the modified code** and trace through it manually for:
   - The typical cases documented in Phase 2
   - Every edge case documented in Phase 2
   - Every error case documented in Phase 2
2. **Run existing tests** via Bash — ALL tests, not just related ones (catch regressions)
3. **Check behavior contract preservation**:
   - Same outputs for same inputs?
   - Same ordering guarantees?
   - Same error handling?
   - Same side effects?
4. If any correctness issue is found, fix it immediately and re-verify

### 4.2 Complexity Verification
1. Analyze the NEW code's time complexity — does it match the target?
2. Analyze the NEW code's space complexity — any unexpected memory overhead?
3. Check for hidden complexity (e.g., calling .sort() inside a loop negates gains)

### 4.3 Performance Verification (if benchmarks available)
1. Run the same benchmarks from Phase 2
2. Compare before vs. after
3. If performance regressed, investigate and fix

### 4.4 Code Quality Check
1. Does the new code follow project conventions?
2. Are imports correct and minimal?
3. Is the code readable and maintainable?
4. Run linters/formatters if available

---

## Phase 5: Report

Write to `.algorithm-expert/optimizations/[optimization-id].md` and present to the user:

```markdown
# Optimization Applied: [Name]

## Change Summary
- **File(s)**: [paths:lines]
- **Before**: [algorithm] — O([time]) time, O([space]) space
- **After**: [algorithm] — O([time]) time, O([space]) space
- **Improvement**: [magnitude and dimension]

## What Changed
[Concise description of the code change]

## Correctness Verification
- Existing tests: [PASS/FAIL — count]
- Edge cases verified: [list]
- Behavior contract: [PRESERVED/MODIFIED — details]

## Performance Impact
- Before: [metric if available]
- After: [metric if available]
- Improvement: [percentage or magnitude]

## Complexity Analysis
| Metric | Before | After |
|--------|--------|-------|
| Time (best) | O(?) | O(?) |
| Time (avg) | O(?) | O(?) |
| Time (worst) | O(?) | O(?) |
| Space | O(?) | O(?) |

## Code Diff
[Key sections of what changed — not the full diff, just the algorithmically interesting parts]

## Rollback
To revert this change: [git command or description]
```

---

## Critical Rules

- **NEVER change observable behavior** — the optimization must be a transparent improvement
- **ALWAYS verify correctness BEFORE reporting success** — run every available test
- **Preserve ordering guarantees** — if the old code produced sorted output, the new code must too
- **Preserve thread safety** — if the old code was thread-safe, the new code must be too
- **Don't optimize away error handling** — edge cases matter more than benchmark numbers
- **Use standard library implementations when possible** — a well-tested stdlib sort beats a hand-rolled one
- **Document the algorithm choice** in a brief code comment — future maintainers need to know WHY
- If the optimization would require changing the public API, STOP and ask the user first
