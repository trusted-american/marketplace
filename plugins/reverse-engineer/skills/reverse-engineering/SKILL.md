---
name: reverse-engineering
description: Comprehensive reference material for ethical software reverse engineering — techniques for black-box analysis, architecture inference, feature extraction, competitive intelligence, drift detection, self-healing, and fidelity measurement using only publicly available information
version: 1.0.0
---

# Software Reverse Engineering — Reference Guide

This skill provides the knowledge foundation for analyzing, understanding, and reconstructing software systems using only publicly available information. All techniques are ethical and legal.

---

## 1. Black-Box Analysis Techniques

Black-box analysis extracts understanding from observable behavior without access to source code.

### 1.1 HTTP Traffic Analysis
- **Response headers** reveal server technology: `Server`, `X-Powered-By`, `X-Request-Id` format, `Set-Cookie` patterns
- **CORS headers** reveal API architecture: `Access-Control-Allow-Origin` shows cross-origin patterns
- **Cache headers** reveal CDN and caching strategy: `Cache-Control`, `X-Cache`, `CF-Cache-Status`, `X-Vercel-Cache`
- **CSP headers** reveal third-party integrations: `Content-Security-Policy` lists allowed domains
- **Rate limit headers** reveal protection strategy: `X-RateLimit-Limit`, `Retry-After`

### 1.2 API Pattern Recognition
- **REST patterns**: Resource-based URLs (`/api/v1/users/:id`), HTTP verbs, pagination styles
- **GraphQL detection**: Single `/graphql` endpoint, POST-only, query/mutation structure in DevTools
- **gRPC-Web detection**: Binary content-type, `/grpc.` prefixed paths
- **WebSocket analysis**: `wss://` connections reveal real-time features and message schemas
- **API versioning**: URL-based (`/v1/`), header-based (`Accept: application/vnd.api+json; version=2`), or query-based (`?version=2`)

### 1.3 Frontend Fingerprinting
- **Framework detection from bundle names**: `main.[hash].js` (React/Webpack), `_app-[hash].js` (Next.js), `index-[hash].js` (Vite)
- **Framework detection from DOM**: `data-reactroot` (React), `ng-version` (Angular), `data-v-` attributes (Vue), `data-svelte` (Svelte)
- **State management clues**: Redux DevTools flag, `__NEXT_DATA__` (Next.js SSR), `__NUXT__` (Nuxt)
- **CSS framework detection**: Class naming patterns — `flex`, `p-4` (Tailwind), `MuiButton` (MUI), `chakra-` (Chakra UI)
- **Build tool detection**: Source map references, chunk naming patterns, module loading strategy

### 1.4 Database Schema Inference
- **From API responses**: Field names, types (string/number/boolean/array/object), nesting patterns
- **From list/filter endpoints**: Query parameters reveal indexed fields (`?status=active&sort=created_at`)
- **From error messages**: Validation errors often reveal field constraints (`"email must be unique"`)
- **From pagination**: Cursor-based (opaque tokens) vs offset (total count) reveals DB capabilities
- **From relationship loading**: `?include=author,comments` or nested objects reveal foreign keys
- **From ID formats**: UUIDs (distributed system), sequential integers (single DB), CUIDs/ULIDs (sorted distributed)

### 1.5 Authentication Architecture Inference
- **Cookie analysis**: `httpOnly`, `secure`, `sameSite` flags, cookie names (`next-auth.session-token`, `sb-access-token`)
- **Token analysis**: JWT structure reveals claims, expiration strategy, signing algorithm
- **OAuth flow detection**: Redirect patterns to `/authorize` endpoints, callback URLs
- **Session management**: Cookie-based (traditional), token-based (SPA), hybrid (BFF pattern)

---

## 2. Intelligence Gathering Methodology

### 2.1 OSINT for Software Systems
Open Source Intelligence techniques adapted for software analysis:

**Primary sources (most reliable):**
- Official documentation and API references
- GitHub/GitLab repositories (README, issues, PRs, architecture docs)
- Engineering blog posts from the company
- Conference talk recordings and slides
- OpenAPI/Swagger specifications
- Changelog and release notes

**Secondary sources (corroborate with primary):**
- StackShare, BuiltWith, Wappalyzer technology profiles
- Job postings (required technologies reveal the stack)
- Stack Overflow questions and answers about the product
- Developer community forums and Discord servers

**Tertiary sources (useful for features, less reliable for architecture):**
- Product review sites (G2, Capterra, TrustRadius)
- Feature comparison articles ("[product] vs [competitor]")
- User blog posts and tutorials
- Social media discussions (Twitter/X, Reddit, Hacker News)

### 2.2 Research Depth Levels
- **Surface**: Marketing site + docs landing page (5 min) — enough for basic understanding
- **Standard**: Full docs + blog + GitHub + StackShare (30 min) — enough for architecture sketch
- **Deep**: All sources + API exploration + traffic analysis + competitive analysis (2+ hours) — enough for reconstruction
- **Exhaustive**: Deep + historical analysis + community intelligence + job posting analysis (4+ hours) — maximum fidelity

### 2.3 Firecrawl Integration
Firecrawl is an API for crawling and extracting structured data from websites:
- **Crawl mode**: Follow links from a starting URL to map entire documentation sites
- **Scrape mode**: Extract structured content from individual pages
- **Map mode**: Get all URLs from a domain for sitemap-style discovery
- **Best for**: Systematically extracting documentation, changelogs, API references
- **Strategy**: Start with map mode to discover all URLs, then scrape key pages for content
- **Rate limiting**: Respect crawl delays and robots.txt directives

### 2.4 Perplexity Integration
Perplexity provides AI-powered search with source citations:
- **Best for**: Synthesizing information from multiple sources about a technology or product
- **Query strategy**: Ask specific, targeted questions rather than broad ones
- **Good queries**: "What database does [product] use?", "[product] architecture microservices or monolith", "[product] tech stack 2024"
- **Verify answers**: Perplexity cites sources — always check the cited URLs for accuracy

---

## 3. Architecture Extraction Patterns

### 3.1 Common Architecture Archetypes

**Monolith (Classic)**:
- Signals: Single domain, consistent response times, session cookies, server-rendered pages
- Stack: Rails, Django, Laravel, Spring Boot, ASP.NET
- Database: Single PostgreSQL/MySQL, possibly Redis for caching

**Modular Monolith**:
- Signals: Single deployment but clear domain boundaries in API paths
- Stack: Same as monolith but with clear module separation
- Database: Single DB with schema separation or multiple schemas

**Microservices**:
- Signals: Multiple subdomains, varying response formats, different error patterns across endpoints
- Stack: Mixed languages, API gateway (Kong, Envoy), service mesh (Istio)
- Database: Different storage per service, eventual consistency patterns

**Serverless / Edge**:
- Signals: Cold start latency, Cloudflare/Vercel/AWS headers, function-like API patterns
- Stack: Next.js/Vercel, Cloudflare Workers, AWS Lambda
- Database: DynamoDB, Planetscale, Neon, Turso, Supabase

**JAMstack / Headless**:
- Signals: Static-first with API calls, CDN-heavy, headless CMS patterns
- Stack: Gatsby/Hugo/Astro frontend, headless CMS (Contentful, Sanity, Strapi)
- Database: CMS-managed, possibly GraphQL

### 3.2 Data Flow Tracing
To map a complete user action through the system:
1. **Trigger**: What user action initiates the flow?
2. **Client-side**: What happens in the browser before any API call?
3. **Request**: What endpoint is called, with what payload?
4. **Server processing**: What validation, auth, and business logic runs?
5. **Data operations**: What reads/writes to what stores?
6. **Side effects**: What events, notifications, or background jobs are triggered?
7. **Response**: What data comes back and in what format?
8. **Client update**: How does the UI reflect the new state?

### 3.3 Scale Inference
- **User count**: From marketing claims, job postings ("millions of users"), funding rounds
- **Data volume**: From pricing tiers (storage limits), API rate limits, pagination strategies
- **Geographic distribution**: CDN PoPs, edge locations, regional compliance mentions
- **Availability target**: SLA claims, status page history, multi-region indicators

---

## 4. Feature Extraction Methodology

### 4.1 Systematic Feature Discovery
1. **Marketing pages**: Every bullet point is a feature — capture them all
2. **Pricing comparison table**: Feature availability per tier reveals the full inventory
3. **Documentation navigation**: Every doc page maps to a feature area
4. **API documentation**: Every endpoint maps to a capability
5. **Changelog**: Historical features plus recent additions
6. **Keyboard shortcuts page**: Reveals interaction features often missed
7. **Integrations page**: Every integration is a feature (OAuth, webhooks, APIs)
8. **Settings pages**: Every configurable option reveals a feature dimension
9. **Help center / FAQ**: Questions reveal edge cases and common workflows
10. **Competitor comparison pages**: "We have X but they don't" reveals features from multiple products

### 4.2 Feature Prioritization Framework
- **P0 — Critical**: The app's core value proposition. Without these, the product doesn't exist. (e.g., for Slack: messaging, channels; for Figma: canvas, vector editing)
- **P1 — Core**: Expected by every user. Missing these makes the product feel incomplete. (e.g., search, notifications, user settings, mobile support)
- **P2 — Enhancement**: Significantly improves experience but product is usable without them. (e.g., keyboard shortcuts, bulk operations, advanced filters, theming)
- **P3 — Nice-to-have**: Delightful but non-essential. Often differentiators in competitive market. (e.g., custom emoji, animated transitions, AI features, community templates)

### 4.3 User Flow Mapping
For each feature, document the complete user flow:
```
Trigger → Preconditions → Step 1 → Step 2 → ... → Success State
                                                  → Error State(s)
                                                  → Edge Case(s)
```

---

## 5. Competitive Analysis Framework

### 5.1 Competitive Intelligence Dimensions
When analyzing competitors alongside the target:

**Feature Parity Matrix**:
| Feature | Target | Competitor A | Competitor B |
|---------|--------|-------------|-------------|
| [Feature] | Yes/No/Partial | Yes/No/Partial | Yes/No/Partial |

**User Experience Comparison**:
- Onboarding flow: steps to first value
- Learning curve: time to proficiency
- Performance: perceived speed, responsiveness
- Design quality: consistency, polish, accessibility
- Mobile experience: native vs responsive vs none

**Market Position**:
- Target audience: enterprise vs SMB vs individual
- Pricing model: freemium, per-seat, usage-based, flat-rate
- Growth strategy: product-led, sales-led, community-led
- Key differentiator: what makes each unique

### 5.2 Adoption Analysis
- **Public metrics**: Funding rounds, valuation, employee count, user count claims
- **Community signals**: GitHub stars, npm downloads, Discord/Slack community size
- **SEO signals**: Search volume trends (Google Trends), keyword competition
- **Social proof**: Logo walls on websites, case study availability
- **Developer adoption**: Stack Overflow question frequency, tutorial availability

### 5.3 Ease of Use Assessment
- **Time to value**: How quickly can a new user accomplish their goal?
- **Cognitive load**: How many concepts must the user understand?
- **Error recovery**: How helpful are error messages? Is undo available?
- **Documentation quality**: Completeness, accuracy, examples, search quality
- **Consistency**: Are patterns reused throughout the UI?

---

## 6. Drift Detection & Fidelity Measurement

### 6.1 Drift Categories
- **Feature drift**: Missing or incomplete features compared to the original
- **Behavioral drift**: Features work differently from the original
- **Architectural drift**: System structure diverges from the extracted architecture
- **Performance drift**: System is slower or handles less load than the original
- **UX drift**: User experience differs from the original's patterns
- **Data model drift**: Schema diverges from the inferred model

### 6.2 Fidelity Scoring Methodology
Score each dimension independently, then compute a weighted average:

| Dimension | Weight | Measurement Method |
|-----------|--------|--------------------|
| Feature completeness | 30% | Acceptance criteria met / total criteria |
| Architecture fidelity | 20% | Component mapping accuracy |
| API surface parity | 15% | Endpoint match rate |
| UI component coverage | 15% | Component implementation rate |
| Data model accuracy | 10% | Schema field match rate |
| Behavioral correctness | 10% | User flow trace accuracy |

### 6.3 Continuous Fidelity Monitoring
After initial build, maintain fidelity through:
1. **Drift checkpoints**: Run after every build phase
2. **Regression detection**: Verify previous features still work after new additions
3. **Baseline updates**: When the original software ships updates, refresh the research
4. **Acceptance test suite**: Automated tests derived from acceptance criteria

---

## 7. Self-Healing Patterns

### 7.1 Autonomous Remediation
Self-healing follows a detect → diagnose → fix → verify loop:
1. **Detect**: Drift detector identifies deviations
2. **Diagnose**: Classify the deviation (missing, incomplete, divergent)
3. **Fix**: Apply the minimum change to resolve the deviation
4. **Verify**: Re-check acceptance criteria and run regression tests
5. **Document**: Record what was changed and why

### 7.2 Fix Prioritization
- **Critical first**: Broken core functionality blocks everything
- **Dependencies matter**: Fix foundations before features that depend on them
- **Minimize blast radius**: Prefer targeted fixes over broad refactors
- **Regression awareness**: After every fix, check that nothing else broke

### 7.3 Healing Limits
- Maximum 3 healing passes to prevent infinite loops
- If fidelity can't reach the threshold, accept and document
- Some drift is acceptable — perfection is not the goal; functional equivalence is
- Human intervention is always an option for complex architectural issues

---

## 8. Context Efficiency Strategies

### 8.1 Context Budgeting for Agent Teams
- Each agent receives only the context it needs — not the entire history
- Research dossier → shared context anchor (written to disk, read on demand)
- Architecture analysis → needed by blueprint-architect, build-orchestrator, drift-detector
- Feature catalog → needed by blueprint-architect, drift-detector
- Blueprint → needed by build-orchestrator, feature-implementer, drift-detector

### 8.2 Memory Architecture
- **Persistent artifacts**: Written to `.reverse-engineer/` directory
  - `research-dossier.md` — Phase 1 output
  - `architecture.md` — Phase 2A output
  - `features.md` — Phase 2B output
  - `blueprint.md` — Phase 3 output
  - `build-log.md` — Phase 4 running log
  - `drift-report.md` — Phase 5 output
  - `fidelity-scorecard.md` — Phase 6 output
- **Agent handoffs**: Structured reports passed between phases
- **Context pruning**: Agents don't re-read the entire dossier; they read the distilled architecture/feature docs

### 8.3 Orchestration Efficiency
- Parallelize independent agents (architecture-extractor + feature-cataloger)
- Sequential phases where outputs depend on inputs
- Within build phases, parallelize independent tasks via feature-implementer agents
- Minimize agent spawning overhead by batching related tasks

---

## 9. Ethical Boundaries

### What IS acceptable:
- Analyzing publicly accessible websites, APIs, and documentation
- Reading open-source code on GitHub/GitLab
- Using published information (blog posts, talks, articles)
- Observing HTTP responses and headers from normal usage
- Reading publicly available job postings
- Using marketing materials and pricing pages

### What is NOT acceptable:
- Decompiling or disassembling proprietary binaries
- Circumventing authentication or access controls
- Accessing private repositories or internal documentation
- Using leaked credentials or data
- Violating terms of service
- Copying copyrighted code verbatim
- Bypassing rate limiting or DRM
- Social engineering employees for technical details
