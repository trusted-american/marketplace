# Reverse Engineer Plugin

Multi-agent system for deep software research, reverse engineering, competitive analysis, autonomous reconstruction, and continuous fidelity assurance with self-healing.

## What It Does

Point Claude at any software and this plugin will:

1. **Research it deeply** — Using WebSearch, WebFetch, Firecrawl, and Perplexity to build an exhaustive intelligence dossier from public sources
2. **Extract the architecture** — Infer system topology, tech stack, data flows, security model, and deployment patterns from observable evidence
3. **Catalog every feature** — Produce an exhaustive feature inventory with priorities, user flows, acceptance criteria, and edge cases
4. **Analyze competitors** — Compare features, UX, adoption, pricing, and tech stacks across the competitive landscape
5. **Generate a blueprint** — Create a dependency-aware implementation plan with phased tasks and acceptance criteria
6. **Build it autonomously** — Execute the blueprint phase-by-phase with orchestrated agent teams and parallel task execution
7. **Detect drift** — Exhaustively compare the built system against the original across 6 fidelity dimensions
8. **Self-heal** — Autonomously fix drift items through prioritized remediation passes until fidelity threshold is met

## Commands

### `/reverse-engineer:reverse-engineer <software> [output-dir]`
Full 7-phase pipeline: research → architecture extraction → feature cataloging → blueprint → build → drift detection → self-healing.

### `/reverse-engineer:analyze-competitors <software> [competitor1,competitor2,...]`
Deep competitive analysis across features, UX, adoption, tech stack, and market position. Can run before or after the main pipeline. Discovers competitors automatically if not provided.

### `/reverse-engineer:setup [target-name]`
Initialize the workspace: detect MCP tools (Firecrawl, Perplexity), configure research depth, set technology preferences, establish fidelity thresholds, and create the `.reverse-engineer/` workspace.

## Agents (10)

| Agent | Model | Role |
|-------|-------|------|
| **deep-researcher** | opus | Exhaustive internet research using layered OSINT methodology |
| **architecture-extractor** | opus | System topology, data flows, and technology extraction |
| **feature-cataloger** | opus | Exhaustive feature inventory with acceptance criteria |
| **competitive-analyst** | sonnet | Individual competitor profiling (parallelized) |
| **ux-analyst** | sonnet | User flows, interaction patterns, design system analysis |
| **blueprint-architect** | opus | Master implementation plan with phased task ordering |
| **build-orchestrator** | opus | Phase execution with parallel task management |
| **feature-implementer** | sonnet | Atomic feature implementation with criteria verification |
| **drift-detector** | opus | 6-dimension fidelity scoring and drift item classification |
| **self-healer** | opus | Autonomous remediation with regression checking |

## Skill

### `reverse-engineering`
Comprehensive reference material covering:
- Black-box analysis techniques (HTTP fingerprinting, API pattern recognition, frontend detection)
- OSINT methodology for software systems (5-layer research strategy)
- Architecture extraction patterns (archetype detection, data flow tracing, scale inference)
- Feature extraction methodology (systematic discovery, prioritization framework)
- Competitive analysis framework (parity matrix, UX comparison, adoption analysis)
- Drift detection and fidelity measurement (6-dimension scoring, continuous monitoring)
- Self-healing patterns (detect → diagnose → fix → verify loops)
- Context efficiency strategies (budgeting, memory architecture, orchestration)
- Ethical boundaries (what's acceptable vs not in reverse engineering)

## Templates (4)

| Template | Purpose |
|----------|---------|
| **blueprint** | Implementation plan with tech selections, data model, API design, build phases |
| **drift-report** | Deviation analysis with severity, category, fix recommendations |
| **fidelity-scorecard** | Final certification with dimension scores and build statistics |
| **competitive-analysis** | Competitor comparison across features, UX, adoption, architecture |

## Hooks

- **Post-write drift logger** — Logs every file modification during build phases to the build log for drift detection
- **Post-bash build logger** — Captures shell command execution during builds

## Configuration

Create `.claude/reverse-engineer.local.md` in your project (or use the `setup` command) to configure:

- **Target software** and reconstruction scope
- **Research depth** (surface / standard / deep / exhaustive)
- **Technology preferences** (override default tech selections)
- **Fidelity threshold** (default: 85%)
- **Priority cutoff** (which feature priorities to implement)
- **Feature exclusions/additions**
- **Build settings** (parallelism, auto-commit, test generation)

## MCP Enhancements

The plugin works with built-in WebSearch/WebFetch, but research quality improves significantly with:

- **Firecrawl MCP** — Systematic documentation crawling, structured data extraction, JS-rendered content
- **Perplexity MCP** — AI-synthesized research with source citations

The `setup` command detects available MCPs and provides installation instructions for missing ones.

## Artifacts Generated

All artifacts are stored in `.reverse-engineer/` for full traceability:

| File | Phase | Description |
|------|-------|-------------|
| `research-dossier.md` | 1 | Complete research findings |
| `architecture.md` | 2 | Extracted system architecture |
| `features.md` | 2 | Exhaustive feature catalog |
| `competitive-analysis.md` | — | Competitor landscape (if run) |
| `blueprint.md` | 3 | Implementation plan |
| `build-log.md` | 4 | Phase-by-phase build record |
| `drift-report.md` | 5 | Fidelity analysis |
| `fidelity-scorecard.md` | 6 | Final certification |

## Fidelity Scoring

The system measures fidelity across 6 weighted dimensions:

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| Feature completeness | 30% | Acceptance criteria met vs total |
| Architecture fidelity | 20% | Component mapping accuracy |
| API surface parity | 15% | Endpoint match rate |
| UI component coverage | 15% | Component implementation rate |
| Data model accuracy | 10% | Schema field match rate |
| Behavioral correctness | 10% | User flow trace accuracy |

Target: **85/100** (configurable). Self-healer runs up to 3 passes to reach the threshold.

## Ethical Boundaries

This plugin uses ONLY publicly available information:
- Official documentation, marketing pages, changelogs
- Open-source repositories and public APIs
- Blog posts, conference talks, technical articles
- User reviews and competitive comparisons
- HTTP headers and observable API patterns

It does NOT:
- Access proprietary source code
- Bypass authentication or access controls
- Decompile binaries or deobfuscate code
- Violate terms of service
- Copy copyrighted code verbatim

## Quick Start

```bash
# 1. Set up the workspace
/reverse-engineer:setup "Linear"

# 2. (Optional) Run competitive analysis first
/reverse-engineer:analyze-competitors "Linear"

# 3. Run the full reverse engineering pipeline
/reverse-engineer:reverse-engineer "Linear"
```

## License

MIT
