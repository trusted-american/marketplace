# Plugin PR Review Checklist

## Structure (blocking)
- [ ] README.md exists with installation + usage
- [ ] LICENSE exists
- [ ] .claude-plugin/plugin.json exists with valid kebab-case name
- [ ] No component dirs inside .claude-plugin/
- [ ] Skills are directories with SKILL.md (not loose .md files)

## Manifest Quality
- [ ] name is unique (check marketplace.json)
- [ ] description is clear and under 200 chars
- [ ] version follows semver
- [ ] keywords are relevant (5-15 recommended)
- [ ] author.name is set
- [ ] license is set (MIT preferred)
- [ ] repository URL set for community plugins

## Component Quality
- [ ] Every skill SKILL.md has name + description frontmatter
- [ ] Every agent .md has name + description + model frontmatter
- [ ] Every command .md has description frontmatter
- [ ] No placeholder/example content left from scaffolding
- [ ] Descriptions are specific enough for auto-triggering

## Content
- [ ] README explains what the plugin does and how to use it
- [ ] No secrets, credentials, or .env values committed
- [ ] No node_modules or build artifacts
- [ ] Agent model choices are justified (opus for reasoning, sonnet for execution)
