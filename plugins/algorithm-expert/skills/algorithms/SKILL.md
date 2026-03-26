---
name: algorithms
description: Comprehensive reference on algorithm families, data structures, complexity analysis, optimization techniques, and decision frameworks for selecting the right algorithm for any computational problem
version: 1.0.0
---

# Algorithm & Data Structure Reference

Master reference for algorithm selection, complexity analysis, and optimization across all major computational domains.

---

## 1. Complexity Analysis Foundations

### Big-O Notation — Common Classes (fastest to slowest)

| Class | Name | Example | 1K items | 1M items |
|-------|------|---------|----------|----------|
| O(1) | Constant | Hash lookup | 1 op | 1 op |
| O(log n) | Logarithmic | Binary search | 10 ops | 20 ops |
| O(√n) | Square root | Trial division | 31 ops | 1,000 ops |
| O(n) | Linear | Array scan | 1,000 ops | 1,000,000 ops |
| O(n log n) | Linearithmic | Merge sort | 10,000 ops | 20,000,000 ops |
| O(n√n) | — | Mo's algorithm | 31,623 ops | 1,000,000,000 ops |
| O(n^2) | Quadratic | Nested loops | 1,000,000 ops | 10^12 ops |
| O(n^3) | Cubic | Matrix multiply (naive) | 10^9 ops | 10^18 ops |
| O(2^n) | Exponential | Subset enumeration | 10^301 ops | — |
| O(n!) | Factorial | Permutation enumeration | — | — |

### Amortized Analysis
Some operations are expensive occasionally but cheap on average:
- **Dynamic array append**: O(1) amortized (O(n) on resize, but resize doubles capacity)
- **Splay tree access**: O(log n) amortized (individual ops can be O(n))
- **Union-Find with path compression + rank**: O(α(n)) ≈ O(1) amortized
- **Fibonacci heap decrease-key**: O(1) amortized (O(log n) worst case)

### Space-Time Trade-offs
| More Space → | Less Time |
|--------------|-----------|
| Hash table (O(n) space) | O(1) lookup (vs O(n) scan) |
| Prefix sum array (O(n) space) | O(1) range sum (vs O(n) recompute) |
| DP table (O(n×m) space) | O(n×m) time (vs exponential recursion) |
| Inverted index (O(n) space) | O(1) text search (vs O(n) scan) |
| Memoization cache (O(n) space) | Avoid recomputation |

---

## 2. Sorting Algorithms

### Comparison-Based Sorts (lower bound: Ω(n log n))

| Algorithm | Best | Average | Worst | Space | Stable | Notes |
|-----------|------|---------|-------|-------|--------|-------|
| **Timsort** | O(n) | O(n log n) | O(n log n) | O(n) | Yes | Python/Java default. Exploits existing runs. |
| **Merge sort** | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes | Predictable. Great for linked lists. |
| **Quicksort** | O(n log n) | O(n log n) | O(n^2) | O(log n) | No | Fastest in practice (cache-friendly). |
| **Heapsort** | O(n log n) | O(n log n) | O(n log n) | O(1) | No | In-place, guaranteed O(n log n). |
| **Introsort** | O(n log n) | O(n log n) | O(n log n) | O(log n) | No | C++ std::sort. Quicksort → heapsort fallback. |
| **Insertion sort** | O(n) | O(n^2) | O(n^2) | O(1) | Yes | Best for nearly-sorted or tiny (n < 20). |
| **Shell sort** | O(n log n) | O(n^{4/3}) | O(n^{3/2}) | O(1) | No | In-place, low overhead. |

### Non-Comparison Sorts (can beat Ω(n log n))

| Algorithm | Time | Space | When to Use |
|-----------|------|-------|-------------|
| **Counting sort** | O(n + k) | O(k) | Integer keys in small range [0, k) |
| **Radix sort** | O(n × d) | O(n + k) | Integers or fixed-length strings, d digits |
| **Bucket sort** | O(n + k) | O(n + k) | Uniformly distributed floating-point |

### Sort Selection Decision Tree
```
Is n < 20?
  → Insertion sort (low overhead, cache-friendly)
Is data nearly sorted?
  → Timsort or insertion sort
Are keys integers in bounded range?
  → Counting sort or radix sort
Need stability?
  → Merge sort or Timsort
Need in-place?
  → Heapsort (guaranteed) or introsort (practical)
Default?
  → Use the language's built-in sort (usually Timsort or introsort)
```

---

## 3. Searching Algorithms

| Algorithm | Time | Space | Prerequisite | Best For |
|-----------|------|-------|-------------|----------|
| **Linear search** | O(n) | O(1) | None | Unsorted, small data |
| **Binary search** | O(log n) | O(1) | Sorted data | Sorted arrays |
| **Hash table lookup** | O(1) avg | O(n) | Hash table built | Exact key lookup |
| **BST search** | O(log n) avg | O(n) | Balanced tree | Ordered data + range queries |
| **Interpolation search** | O(log log n) avg | O(1) | Sorted + uniform | Uniformly distributed numeric keys |
| **Exponential search** | O(log n) | O(1) | Sorted | Unbounded/infinite lists |
| **Trie lookup** | O(k) | O(alphabet × n × k) | Trie built | Prefix search, autocomplete |
| **Bloom filter** | O(k) | O(m bits) | Filter built | Approximate membership (set containment) |
| **B-tree search** | O(log_B n) | O(n) | B-tree built | Disk-based / database indexes |

### Search Selection Decision Tree
```
Need exact key lookup?
  → Hash table (O(1) average)
Need ordered iteration + search?
  → Balanced BST or B-tree (O(log n))
Need prefix matching?
  → Trie (O(k) where k = key length)
Need approximate membership?
  → Bloom filter (O(1), false positives only)
Data is sorted array?
  → Binary search (O(log n))
Data is small or unsorted?
  → Linear search (O(n), but cache-friendly)
```

---

## 4. Graph Algorithms

### Traversal
| Algorithm | Time | Space | Use Case |
|-----------|------|-------|----------|
| **BFS** | O(V+E) | O(V) | Shortest path (unweighted), level-order |
| **DFS** | O(V+E) | O(V) | Connectivity, cycle detection, topological sort |

### Shortest Path
| Algorithm | Time | Space | Use Case |
|-----------|------|-------|----------|
| **Dijkstra** | O((V+E) log V) | O(V) | Non-negative weights, single source |
| **Bellman-Ford** | O(V×E) | O(V) | Negative weights, negative cycle detection |
| **Floyd-Warshall** | O(V^3) | O(V^2) | All-pairs shortest path |
| **A*** | O(E) best case | O(V) | Single target with heuristic (maps, games) |
| **Johnson's** | O(V^2 log V + VE) | O(V^2) | All-pairs, sparse graph, some negative weights |

### Minimum Spanning Tree
| Algorithm | Time | Use Case |
|-----------|------|----------|
| **Kruskal's** | O(E log E) | Sparse graphs (edge list natural) |
| **Prim's** | O((V+E) log V) | Dense graphs (adjacency list/matrix) |
| **Borůvka's** | O(E log V) | Parallel-friendly |

### Other Graph Algorithms
| Problem | Algorithm | Time |
|---------|-----------|------|
| Topological sort | Kahn's (BFS) or DFS | O(V+E) |
| Strongly connected components | Tarjan's or Kosaraju's | O(V+E) |
| Articulation points / bridges | Tarjan's | O(V+E) |
| Maximum flow | Ford-Fulkerson / Dinic's | O(VE^2) / O(V^2E) |
| Bipartite matching | Hopcroft-Karp | O(E√V) |
| Cycle detection | DFS with coloring | O(V+E) |
| Euler path/circuit | Hierholzer's | O(E) |

---

## 5. Dynamic Programming

### When to Use DP
A problem has optimal substructure AND overlapping subproblems:
1. **Optimal substructure**: Optimal solution contains optimal solutions to subproblems
2. **Overlapping subproblems**: Same subproblems are solved multiple times

### Classic DP Patterns

| Pattern | Problems | Recurrence Shape |
|---------|----------|------------------|
| **Linear DP** | Fibonacci, climbing stairs, house robber | dp[i] = f(dp[i-1], dp[i-2]) |
| **Knapsack** | 0/1 knapsack, subset sum, coin change | dp[i][w] = max(include, exclude) |
| **LCS/Edit distance** | Longest common subsequence, diff | dp[i][j] = f(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) |
| **Interval DP** | Matrix chain, balloon burst | dp[i][j] = min over k of (dp[i][k] + dp[k][j]) |
| **Tree DP** | Tree diameter, subtree problems | dp[node] = f(dp[children]) |
| **Bitmask DP** | TSP, assignment, Hamiltonian path | dp[mask][i] = f(dp[mask^bit][j]) |
| **Digit DP** | Count numbers with property | dp[pos][tight][state] |

### DP Optimization Techniques
- **Space optimization**: If dp[i] only depends on dp[i-1], use two rows instead of full table
- **Memoization vs tabulation**: Top-down memo for sparse subproblem spaces; bottom-up table for dense
- **Knuth's optimization**: Reduce O(n^3) interval DP to O(n^2) when optimal split points are monotone
- **Convex hull trick**: Reduce O(n^2) linear DP to O(n log n) when transitions are linear functions
- **Divide and conquer optimization**: When opt[i][j] ≤ opt[i][j+1], reduce O(n^2k) to O(nk log n)

---

## 6. String Algorithms

| Algorithm | Time | Use Case |
|-----------|------|----------|
| **KMP** | O(n + m) | Single pattern matching |
| **Rabin-Karp** | O(n + m) avg | Multiple pattern matching, rolling hash |
| **Aho-Corasick** | O(n + m + z) | Multiple pattern matching simultaneously |
| **Boyer-Moore** | O(n/m) best | Fast single pattern (long patterns) |
| **Suffix array** | O(n log n) build, O(m log n) query | Multiple queries on same text |
| **Suffix tree** | O(n) build | Substring queries, LCP, repeat finding |
| **Z-algorithm** | O(n + m) | Pattern matching, period finding |
| **Manacher's** | O(n) | Longest palindromic substring |
| **Levenshtein distance** | O(n × m) | Edit distance, fuzzy matching |

---

## 7. Data Structures Quick Reference

### Linear Structures
| Structure | Access | Search | Insert | Delete | Notes |
|-----------|--------|--------|--------|--------|-------|
| **Array** | O(1) | O(n) | O(n) | O(n) | Cache-friendly, fixed size |
| **Dynamic array** | O(1) | O(n) | O(1)* | O(n) | Amortized append |
| **Linked list** | O(n) | O(n) | O(1)† | O(1)† | Good for frequent insert/delete at known position |
| **Deque** | O(1) | O(n) | O(1)‡ | O(1)‡ | Double-ended, front/back ops |
| **Skip list** | O(log n) | O(log n) | O(log n) | O(log n) | Probabilistic, concurrent-friendly |

### Hash-Based Structures
| Structure | Lookup | Insert | Delete | Notes |
|-----------|--------|--------|--------|-------|
| **Hash map** | O(1) avg | O(1) avg | O(1) avg | Most common key-value store |
| **Hash set** | O(1) avg | O(1) avg | O(1) avg | Membership testing |
| **Bloom filter** | O(k) | O(k) | N/A | Probabilistic membership, very space-efficient |
| **Cuckoo hash** | O(1) worst | O(1) avg | O(1) | Guaranteed worst-case lookup |
| **Swiss table** | O(1) avg | O(1) avg | O(1) avg | SIMD-accelerated, Google's absl |

### Tree Structures
| Structure | Search | Insert | Delete | Notes |
|-----------|--------|--------|--------|-------|
| **BST** | O(h) | O(h) | O(h) | h = log n balanced, n worst |
| **AVL tree** | O(log n) | O(log n) | O(log n) | Strictly balanced, fast lookup |
| **Red-Black tree** | O(log n) | O(log n) | O(log n) | Relaxed balance, fast insert/delete |
| **B-tree** | O(log_B n) | O(log_B n) | O(log_B n) | Disk-optimized, database indexes |
| **Trie** | O(k) | O(k) | O(k) | k = key length. Prefix queries. |
| **Segment tree** | O(log n) | O(log n) | — | Range queries + point updates |
| **Fenwick tree** | O(log n) | O(log n) | — | Prefix sums, simpler than segment tree |

### Heap/Priority Queue
| Structure | Find-min | Insert | Decrease-key | Delete-min | Merge |
|-----------|----------|--------|-------------|------------|-------|
| **Binary heap** | O(1) | O(log n) | O(log n) | O(log n) | O(n) |
| **Fibonacci heap** | O(1) | O(1)* | O(1)* | O(log n)* | O(1) |
| **Pairing heap** | O(1) | O(1) | O(log n)* | O(log n)* | O(1) |

*amortized

---

## 8. Probabilistic & Approximate Algorithms

| Algorithm | Purpose | Error | Space |
|-----------|---------|-------|-------|
| **Bloom filter** | Set membership | False positives only | O(m bits) |
| **Count-Min Sketch** | Frequency estimation | Overestimates | O(w × d) |
| **HyperLogLog** | Cardinality estimation | ~2% error | O(m bytes) |
| **MinHash** | Set similarity (Jaccard) | Configurable | O(k per set) |
| **Locality-Sensitive Hashing** | Approx nearest neighbor | Configurable | O(L × n × k) |
| **Reservoir sampling** | Uniform sample from stream | Exact | O(k) |
| **Morris counting** | Approximate counting | ~30% error | O(log log n) bits |

### When to Use Probabilistic Algorithms
- Data is too large to store exactly
- Approximate answer is acceptable
- Need sub-linear space or single-pass processing
- Streaming data that can't be stored

---

## 9. Parallel & Concurrent Algorithm Patterns

| Pattern | Use Case | Key Consideration |
|---------|----------|-------------------|
| **Map-Reduce** | Independent per-element operations | Embarrassingly parallel |
| **Fork-Join** | Divide-and-conquer problems | Work-stealing for load balance |
| **Pipeline** | Multi-stage processing | Stage throughput balancing |
| **Producer-Consumer** | Decoupled generation/processing | Queue backpressure |
| **Read-Copy-Update (RCU)** | Read-heavy concurrent data | Near-zero read overhead |
| **Lock-free queue** | High-throughput messaging | CAS-based, ABA problem |
| **Concurrent hash map** | Shared key-value store | Striped locking or lock-free |
| **Parallel prefix sum** | Cumulative operations | O(n/p + log p) with p processors |

---

## 10. Algorithm Selection Framework

### Step 1: Classify the Problem
What type of problem is this? (sorting, searching, graph, string, optimization, etc.)

### Step 2: Identify Constraints
- Input size (n)
- Time budget
- Space budget
- Exactness requirement
- Online vs. offline (streaming vs. batch)
- Static vs. dynamic (read-only vs. updates)

### Step 3: Check for Special Structure
- Is the data sorted? → Use this for binary search, merge
- Is the data nearly sorted? → Insertion sort, Timsort
- Are keys integers in bounded range? → Counting/radix sort
- Is the graph sparse or dense? → Choose representation accordingly
- Does the problem have optimal substructure? → Try DP
- Can the problem be decomposed independently? → Parallelize

### Step 4: Consider Practical Factors
- Cache friendliness (arrays > pointers)
- Branch prediction (simple comparisons > complex conditions)
- Memory allocation (pre-allocate > dynamic allocation in hot loop)
- Standard library availability (use it if it exists)
- Implementation complexity (simpler is better if performance is comparable)

### Step 5: Benchmark if Uncertain
Theory and practice diverge for:
- Small n (constant factors dominate)
- Memory-bound operations (cache misses dominate)
- Modern CPUs (branch prediction, SIMD, speculative execution)
- Interpreted languages (interpreter overhead changes breakpoints)
