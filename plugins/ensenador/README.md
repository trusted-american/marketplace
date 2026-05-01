# enseñador

A Socratic-method coding mentor for Claude Code. **Designed to teach, not to ship.**

`enseñador` (Spanish for *teacher*) is the opposite of an autocomplete. It refuses to write your code, refuses to hand you the answer, and refuses to let you skip past the part where you actually have to think. Instead, it asks pointed questions, surfaces authoritative documentation, and pushes you to articulate your reasoning out loud until the answer falls out.

Use it when you want to **learn**, not when you want to ship.

---

## Why this exists

LLM coding tools are excellent at generating code. They are catastrophically bad at producing engineers. If every problem you face gets solved by typing it into a chat box, you never build the mental scaffolding to solve novel problems on your own.

`enseñador` is opinionated about that. It treats the user as a learner — not a customer to please — and applies the same techniques a strong human mentor would: productive struggle, active retrieval, error-driven restructuring, and citation of primary sources.

If you ask it to "just write the function for me," it will say no, and ask you why you think that's the right thing to want.

---

## Commands

### `/ensenador:map <feature description>`

You write a detailed plan for the feature you want to build. The agent reviews it like a senior engineer reviewing a design doc — cross-referencing your plan against authoritative sources (official docs, RFCs, reputable engineering blogs, context7 references) and pushing back on every weak assumption.

You **cannot proceed** to implementation until the plan is sound. The agent will iterate with you, asking questions like:

- "What happens to in-flight requests when this service restarts?"
- "Why this data structure and not that one — what's the access pattern?"
- "You said 'cache it' — what's the invalidation rule?"
- "Show me the line in the spec that says this is allowed."

When (and only when) the plan survives review, you get a green light.

### `/ensenador:guidance <question>`

You ask a question. The agent gives you:

1. **Leading questions** that probe what you actually need to figure out
2. **Pointers** — concrete things to look up, terms to search, files to read
3. **Resource links** — official docs, MDN, RFC sections, Stack Overflow threads, conference talks, papers — the *primary* sources, not summaries
4. **A challenge** — usually a small experiment you can run to find the answer yourself

What it will *not* give you: the answer.

### `/ensenador:validate <description-of-your-work>`

You submit your implementation (a diff, a snippet, a PR link, a description). The agent puts it under a microscope along four axes:

- **Industry correctness** — does it match how this is done in the field?
- **Use-case correctness** — does it solve *your* problem?
- **Security** — what attack surface does it expose?
- **Scalability & reliability** — what breaks at 10×, 100×, 1000× load? What breaks under partial failure?

For each finding, you get the critique, the underlying principle, and the resource you should read to internalize it. The agent does real research — it will WebSearch and WebFetch authoritative sources before issuing verdicts.

---

## Agents

| Agent | Role |
|-------|------|
| **socratic-questioner** | Specialized in probing questions. Never gives answers — only asks the next question that moves the learner forward. |
| **knowledge-researcher** | Deep web research on whatever topic the learner is working in. Reads official docs, RFCs, papers, engineering blogs. Provides citations. |
| **learning-validator** | Critiques learner-submitted work against industry standards. Cites the principle behind every finding. |

## Skill

### `socratic-teaching`
The persistent teaching philosophy that governs every interaction: question-first, never-write-the-code, cite-primary-sources, productive-struggle-over-comfort.

---

## When NOT to use this plugin

- You're under deadline pressure and need to ship.
- You're an expert in this exact area and just need execution speed.
- You want a code generator. Use a different plugin.

`enseñador` is for the moments when you've decided that building the skill is more valuable than finishing the task quickly. Those moments are rare; treat them seriously.

---

## License

MIT
