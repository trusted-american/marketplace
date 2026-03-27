---
description: Initialize the reverse engineering workspace — configure target, MCP integrations (Firecrawl, Perplexity), research depth, fidelity thresholds, tech stack preferences, and project conventions
argument-hint: [target-software-name]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebSearch
---

You are setting up the reverse engineering workspace for a new project. This command prepares everything needed before the main `reverse-engineer` or `analyze-competitors` commands run.

**Input parsing:**
Parse `$ARGUMENTS`: an optional software name/URL to pre-configure as the target.

---

## Step 1: Detect Environment

Scan the current workspace to understand what's available:

### 1.1 MCP Tool Detection
Check for available MCP tools that enhance research capabilities:

**Firecrawl MCP** (deep web crawling):
- Look for Firecrawl-related tools in the available tool list
- If available: note the tool names for research agents to use
- If NOT available: document that research will use WebSearch/WebFetch only
- Suggest to the user: "For deeper research, consider adding the Firecrawl MCP server to your `.mcp.json`"

**Perplexity MCP** (AI-powered search):
- Look for Perplexity-related tools in the available tool list
- If available: note the tool names for research agents to use
- If NOT available: document that research will use WebSearch only
- Suggest to the user: "For AI-synthesized research, consider adding the Perplexity MCP server"

**Other useful MCPs**:
- Puppeteer/Playwright MCP — for live UI analysis
- Database MCPs — if connecting to existing schemas
- GitHub MCP — for open-source target analysis

### 1.2 Project State Detection
Check the current workspace:
- Is there an existing project? (`package.json`, `requirements.txt`, `go.mod`, etc.)
- Is there an existing `.reverse-engineer/` directory? (resuming previous work)
- Is there a `.claude/reverse-engineer.local.md` override file?
- What's the git status? (clean working directory preferred)

### 1.3 Available Tools Inventory
Catalog all available tools and categorize them:
- **Research tools**: WebSearch, WebFetch, Firecrawl tools, Perplexity tools
- **Build tools**: Read, Write, Edit, Bash, Glob, Grep
- **Orchestration tools**: Agent
- **Version control**: git via Bash

---

## Step 2: Interactive Configuration

Create the configuration file at `.claude/reverse-engineer.local.md` with user preferences.

### 2.1 Target Configuration
```markdown
# Reverse Engineer Configuration

## Target
- **Software**: {{name or URL}}
- **Type**: {{SaaS / Desktop App / Mobile App / CLI Tool / Library / API Service}}
- **Scope**: {{Full reconstruction / Core features only / Architecture study / Specific features}}
```

### 2.2 Research Configuration
```markdown
## Research Settings
- **Depth**: {{surface / standard / deep / exhaustive}}
  - Surface: Marketing + docs landing (5 min research)
  - Standard: Full docs + blog + GitHub (30 min research)
  - Deep: All sources + API exploration + competitive analysis (2+ hours)
  - Exhaustive: Deep + historical + community intelligence (4+ hours)
- **Competitor analysis**: {{yes / no}}
- **Known competitors**: {{comma-separated list or "auto-discover"}}
```

### 2.3 Technology Preferences
```markdown
## Technology Preferences
Override technology selections (leave blank to match original):
- **Frontend**: {{e.g., "Next.js 14 with App Router" or blank}}
- **Backend**: {{e.g., "Node.js with Fastify" or blank}}
- **Database**: {{e.g., "PostgreSQL with Drizzle ORM" or blank}}
- **Cache**: {{e.g., "Redis" or blank}}
- **Auth**: {{e.g., "Clerk" or blank}}
- **Styling**: {{e.g., "Tailwind CSS" or blank}}
- **Hosting**: {{e.g., "Vercel" or blank}}
- **Package manager**: {{npm / pnpm / yarn / bun}}
```

### 2.4 Fidelity Configuration
```markdown
## Fidelity Settings
- **Target fidelity score**: {{0-100, default: 85}}
- **Max self-healing passes**: {{1-3, default: 3}}
- **Priority cutoff**: {{P0 only / P0+P1 / P0+P1+P2 / All}}
  - P0 only: Just critical features
  - P0+P1: Critical + core features (recommended minimum)
  - P0+P1+P2: Including enhancements (recommended for production)
  - All: Every feature including nice-to-haves
```

### 2.5 Build Configuration
```markdown
## Build Settings
- **Output directory**: {{path, default: ./}}
- **Max parallel agents**: {{1-5, default: 3}}
- **Auto-commit phases**: {{yes / no — commit after each build phase}}
- **Test generation**: {{yes / no — generate tests alongside implementation}}
- **Lint on build**: {{yes / no — run linters after each phase}}
```

### 2.6 Feature Exclusions
```markdown
## Feature Exclusions
Features to SKIP during reconstruction:
- {{feature name or domain to exclude}}
- {{e.g., "billing", "admin panel", "mobile app"}}

## Feature Additions
Features to ADD that aren't in the original:
- {{feature description}}
```

---

## Step 3: Create Workspace Structure

Create the `.reverse-engineer/` directory structure:

```bash
mkdir -p .reverse-engineer
```

Create placeholder files so agents know where to write:
- `.reverse-engineer/README.md` — Explains the directory's purpose
- `.reverse-engineer/.gitkeep` — Ensures the directory is tracked

Write `.reverse-engineer/README.md`:
```markdown
# Reverse Engineering Workspace

This directory contains all artifacts from the reverse engineering process.
Generated by the `reverse-engineer` plugin.

## Files (generated during execution)
- `research-dossier.md` — Deep research findings (Phase 1)
- `architecture.md` — Extracted architecture (Phase 2)
- `features.md` — Feature catalog (Phase 2)
- `competitive-analysis.md` — Competitor landscape (if run)
- `blueprint.md` — Implementation plan (Phase 3)
- `build-log.md` — Phase-by-phase build record (Phase 4)
- `drift-report.md` — Fidelity analysis (Phase 5)
- `fidelity-scorecard.md` — Final certification (Phase 6)

## Configuration
See `.claude/reverse-engineer.local.md` for project settings.
```

---

## Step 4: Validate MCP Connectivity

If Firecrawl or Perplexity MCP tools were detected:
1. Run a test query to verify they're working
2. Report success/failure to the user

If NO research-enhancing MCPs are detected:
1. Inform the user that research will use built-in WebSearch/WebFetch
2. Explain what Firecrawl and Perplexity add:
   - **Firecrawl**: Systematic crawling of entire documentation sites, structured data extraction, JavaScript-rendered page content
   - **Perplexity**: AI-synthesized answers with source citations, better at "what tech does X use?" type questions
3. Provide setup instructions for each:
   ```
   To add Firecrawl MCP, add to your .mcp.json:
   {
     "mcpServers": {
       "firecrawl": {
         "command": "npx",
         "args": ["-y", "firecrawl-mcp"],
         "env": { "FIRECRAWL_API_KEY": "your-key" }
       }
     }
   }

   To add Perplexity MCP, add to your .mcp.json:
   {
     "mcpServers": {
       "perplexity": {
         "command": "npx",
         "args": ["-y", "perplexity-mcp"],
         "env": { "PERPLEXITY_API_KEY": "your-key" }
       }
     }
   }
   ```

---

## Step 5: Setup Report

Present the user with a summary:

```markdown
## Reverse Engineer Setup Complete

### Target
- Software: [name]
- Scope: [scope]
- Research depth: [depth]

### Environment
- Research tools: [WebSearch, WebFetch, Firecrawl (if available), Perplexity (if available)]
- Build tools: [available tools]
- MCP enhancements: [list or "none — see recommendations above"]

### Configuration
- Config file: .claude/reverse-engineer.local.md
- Workspace: .reverse-engineer/
- Fidelity target: [threshold]%
- Priority cutoff: [cutoff]

### Ready to Run
- `/reverse-engineer:reverse-engineer [target]` — Start the full pipeline
- `/reverse-engineer:analyze-competitors [target]` — Run competitive analysis first (recommended)

### Recommendations
- [Any setup improvements detected]
```

---

## Critical Rules

- ALWAYS create the `.claude/reverse-engineer.local.md` config file — it's the control plane for the entire pipeline
- ALWAYS create the `.reverse-engineer/` workspace directory
- If the user provides a target, pre-populate the config with the target name
- If existing config/workspace exists, ask before overwriting — the user may be resuming previous work
- MCP detection should be informative, not blocking — the plugin works without Firecrawl/Perplexity, just with reduced research depth
- Configuration values should have sensible defaults — don't require the user to configure everything
