import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  listDirs,
  fileExists,
  generateRegistry,
  writeRegistry,
} from "../../lib/registry.js";

// Resolve marketplace root (two levels up from src/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MARKETPLACE_ROOT = path.resolve(__dirname, "../../../");

const PLUGINS_DIR = path.join(MARKETPLACE_ROOT, "plugins");
const COMMUNITY_DIR = path.join(MARKETPLACE_ROOT, "community");

const REQUIRED_FILES = ["README.md", "LICENSE", ".claude-plugin"];

const KEBAB_CASE = /^[a-z0-9-]+$/;

const MIT_LICENSE_TEMPLATE = (year, holder) =>
  `MIT License\n\nCopyright (c) ${year} ${holder}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function pluginDir(category, name) {
  const base = category === "community" ? COMMUNITY_DIR : PLUGINS_DIR;
  const resolved = path.resolve(base, name);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`Invalid plugin name: path escapes allowed directory`);
  }
  return resolved;
}

async function readJsonSafe(p) {
  try {
    const data = await fs.readFile(p, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}

async function regenerateMarketplaceJson() {
  const { plugins, warnings } = await generateRegistry(PLUGINS_DIR, COMMUNITY_DIR);
  for (const w of warnings) console.warn(`WARNING: ${w}`);
  const { count } = await writeRegistry(path.join(MARKETPLACE_ROOT, ".claude", "marketplace.json"), plugins);
  return count;
}

async function validatePlugin(dir) {
  const errors = [];
  const warnings = [];
  const name = path.basename(dir);

  // Required files
  for (const file of REQUIRED_FILES) {
    const target =
      file === ".claude-plugin"
        ? path.join(dir, ".claude-plugin", "plugin.json")
        : path.join(dir, file);
    if (!(await fileExists(target))) {
      errors.push(`Missing required: ${file === ".claude-plugin" ? ".claude-plugin/plugin.json" : file}`);
    }
  }

  // Validate plugin.json contents
  const manifestPath = path.join(dir, ".claude-plugin", "plugin.json");
  try {
    const manifest = await readJsonSafe(manifestPath);
    if (manifest) {
      if (!manifest.name) errors.push("plugin.json: missing required field 'name'");
      if (!manifest.description) warnings.push("plugin.json: missing 'description'");
      if (!manifest.version) warnings.push("plugin.json: missing 'version'");
      if (manifest.name && !KEBAB_CASE.test(manifest.name)) {
        errors.push("plugin.json: 'name' must be kebab-case (lowercase, hyphens only)");
      }
    }
  } catch (e) {
    errors.push(`plugin.json: invalid JSON — ${e.message}`);
  }

  // Structural warnings
  const badDirs = [];
  for (const d of ["commands", "agents", "skills", "hooks", "templates"]) {
    if (await fileExists(path.join(dir, ".claude-plugin", d))) {
      badDirs.push(d);
    }
  }
  if (badDirs.length > 0) {
    errors.push(
      `Directories inside .claude-plugin/ must be at plugin root: ${badDirs.join(", ")}`
    );
  }

  // Check skills structure
  const skillsDir = path.join(dir, "skills");
  if (await fileExists(skillsDir)) {
    for (const skill of await listDirs(skillsDir)) {
      const skillMd = path.join(skillsDir, skill, "SKILL.md");
      if (!(await fileExists(skillMd))) {
        errors.push(`skills/${skill}/ is missing SKILL.md`);
      }
    }
  }

  // Check agents structure
  const agentsDir = path.join(dir, "agents");
  if (await fileExists(agentsDir)) {
    try {
      const agentFiles = (await fs.readdir(agentsDir)).filter((f) => f.endsWith(".md"));
      if (agentFiles.length === 0) {
        warnings.push("agents/ directory exists but contains no .md files");
      }
    } catch (e) {
      warnings.push(`agents/: could not read directory — ${e.message}`);
    }
  }

  // Check commands structure
  const commandsDir = path.join(dir, "commands");
  if (await fileExists(commandsDir)) {
    try {
      const cmdFiles = (await fs.readdir(commandsDir)).filter((f) => f.endsWith(".md"));
      if (cmdFiles.length === 0) {
        warnings.push("commands/ directory exists but contains no .md files");
      }
    } catch (e) {
      warnings.push(`commands/: could not read directory — ${e.message}`);
    }
  }

  // Check templates structure
  const templatesDir = path.join(dir, "templates");
  if (await fileExists(templatesDir)) {
    try {
      const tplFiles = (await fs.readdir(templatesDir)).filter((f) => f.endsWith(".md"));
      if (tplFiles.length === 0) {
        warnings.push("templates/ directory exists but contains no .md files");
      }
    } catch (e) {
      warnings.push(`templates/: could not read directory — ${e.message}`);
    }
  }

  // Check hooks structure
  const hooksDir = path.join(dir, "hooks");
  if (await fileExists(hooksDir)) {
    try {
      const hookFiles = (await fs.readdir(hooksDir)).filter((f) => f.endsWith(".json"));
      if (hookFiles.length === 0) {
        warnings.push("hooks/ directory exists but contains no .json files");
      }
    } catch (e) {
      warnings.push(`hooks/: could not read directory — ${e.message}`);
    }
  }

  return { name, errors, warnings, valid: errors.length === 0 };
}

// ── Server ───────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "marketplace-mcp",
  version: "1.0.0",
});

// ── Tool: create_plugin ──────────────────────────────────────────────────────

server.tool(
  "create_plugin",
  "Scaffold a new plugin with all required files and correct directory structure",
  {
    name: z
      .string()
      .regex(KEBAB_CASE, "Must be kebab-case")
      .describe("Plugin name (kebab-case)"),
    description: z.string().describe("Brief description of the plugin"),
    category: z
      .enum(["plugins", "community"])
      .default("plugins")
      .describe("Where to create the plugin"),
    author: z.string().optional().describe("Author name"),
    upstream: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .describe("Upstream repo URL (required for community plugins)"),
    components: z
      .array(z.enum(["skills", "agents", "hooks", "commands", "templates"]))
      .optional()
      .describe("Component directories to create"),
    mcp: z.boolean().optional().describe("Include .mcp.json stub"),
  },
  async ({ name, description, category, author, upstream, components, mcp }) => {
    if (category === "community" && !upstream) {
      return {
        content: [{ type: "text", text: "Community plugins require an 'upstream' URL." }],
      };
    }

    let dir;
    try {
      dir = pluginDir(category, name);
    } catch (e) {
      return { content: [{ type: "text", text: e.message }] };
    }

    if (await fileExists(dir)) {
      return { content: [{ type: "text", text: `Plugin '${name}' already exists at ${dir}` }] };
    }

    try {
      // Create directory structure
      await fs.mkdir(path.join(dir, ".claude-plugin"), { recursive: true });

      // plugin.json
      const manifest = {
        name,
        description,
        version: "1.0.0",
      };
      if (author) manifest.author = { name: author };
      if (upstream) manifest.repository = upstream;
      manifest.license = "MIT";

      await fs.writeFile(
        path.join(dir, ".claude-plugin", "plugin.json"),
        JSON.stringify(manifest, null, 2) + "\n"
      );

      // README.md
      const readmeLines = [`# ${name}`, "", description, ""];
      if (upstream) {
        readmeLines.push(`> Forked from [upstream](${upstream})`, "");
      }
      readmeLines.push(
        "## Installation",
        "",
        "```bash",
        `claude plugin install ${name}@marketplace`,
        "```",
        ""
      );
      await fs.writeFile(path.join(dir, "README.md"), readmeLines.join("\n"));

      // LICENSE
      const year = new Date().getFullYear();
      const holder = author || "Trusted American Insurance Agency";
      await fs.writeFile(path.join(dir, "LICENSE"), MIT_LICENSE_TEMPLATE(year, holder));

      // Component directories
      if (components) {
        for (const comp of components) {
          if (comp === "skills") {
            const exampleSkill = path.join(dir, "skills", "example");
            await fs.mkdir(exampleSkill, { recursive: true });
            await fs.writeFile(
              path.join(exampleSkill, "SKILL.md"),
              `---\nname: example\ndescription: Example skill — replace with your own\n---\n\nDescribe what this skill does here.\n`
            );
          } else if (comp === "agents") {
            await fs.mkdir(path.join(dir, "agents"), { recursive: true });
            await fs.writeFile(
              path.join(dir, "agents", "example.md"),
              `---\nname: example\ndescription: Example agent — replace with your own\nmodel: sonnet\n---\n\nDescribe the agent's role and behavior here.\n`
            );
          } else if (comp === "hooks") {
            await fs.mkdir(path.join(dir, "hooks"), { recursive: true });
            await fs.writeFile(
              path.join(dir, "hooks", "hooks.json"),
              JSON.stringify({ hooks: {} }, null, 2) + "\n"
            );
          } else if (comp === "commands") {
            await fs.mkdir(path.join(dir, "commands"), { recursive: true });
            await fs.writeFile(
              path.join(dir, "commands", "example.md"),
              `---\ndescription: Example command — replace with your own\n---\n\nDescribe what this command does.\n`
            );
          } else if (comp === "templates") {
            await fs.mkdir(path.join(dir, "templates"), { recursive: true });
            await fs.writeFile(
              path.join(dir, "templates", "example.md"),
              `---\nname: example\ndescription: Example template — replace with your own\n---\n\nDefine output template structure here.\n`
            );
          }
        }
      }

      // .mcp.json
      if (mcp) {
        await fs.writeFile(
          path.join(dir, ".mcp.json"),
          JSON.stringify({ mcpServers: {} }, null, 2) + "\n"
        );
      }

      const created = [
        ".claude-plugin/plugin.json",
        "README.md",
        "LICENSE",
        ...(components || []).map((c) =>
          c === "skills"
            ? "skills/example/SKILL.md"
            : c === "hooks"
              ? "hooks/hooks.json"
              : c === "agents"
                ? "agents/example.md"
                : c === "templates"
                  ? "templates/example.md"
                  : "commands/example.md"
        ),
        ...(mcp ? [".mcp.json"] : []),
      ];

      // Regenerate marketplace.json
      const total = await regenerateMarketplaceJson();

      return {
        content: [
          {
            type: "text",
            text: `Created plugin '${name}' at ${dir}\n\nFiles:\n${created.map((f) => `  ${f}`).join("\n")}\n\nmarketplace.json updated (${total} plugin(s) indexed)`,
          },
        ],
      };
    } catch (e) {
      // Rollback on failure
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch {}
      return {
        content: [{ type: "text", text: `Failed to create plugin: ${e.message}` }],
      };
    }
  }
);

// ── Tool: validate_plugin ────────────────────────────────────────────────────

server.tool(
  "validate_plugin",
  "Validate a plugin has all required files and correct structure",
  {
    name: z
      .string()
      .regex(KEBAB_CASE, "Must be kebab-case")
      .describe("Plugin name"),
    category: z
      .enum(["plugins", "community"])
      .default("plugins")
      .describe("Which directory to look in"),
  },
  async ({ name, category }) => {
    let dir;
    try {
      dir = pluginDir(category, name);
    } catch (e) {
      return { content: [{ type: "text", text: e.message }] };
    }

    if (!(await fileExists(dir))) {
      return {
        content: [{ type: "text", text: `Plugin '${name}' not found in ${category}/` }],
      };
    }

    const result = await validatePlugin(dir);
    const lines = [`Validation: ${result.name} — ${result.valid ? "PASS" : "FAIL"}`];

    if (result.errors.length > 0) {
      lines.push("", "Errors:");
      result.errors.forEach((e) => lines.push(`  ✗ ${e}`));
    }
    if (result.warnings.length > 0) {
      lines.push("", "Warnings:");
      result.warnings.forEach((w) => lines.push(`  ! ${w}`));
    }
    if (result.valid && result.warnings.length === 0) {
      lines.push("  All checks passed.");
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ── Tool: validate_all ───────────────────────────────────────────────────────

server.tool(
  "validate_all",
  "Validate every plugin in the marketplace",
  {},
  async () => {
    const dirs = [];

    for (const [label, base] of [["plugins", PLUGINS_DIR], ["community", COMMUNITY_DIR]]) {
      for (const name of await listDirs(base)) {
        dirs.push({ category: label, dir: path.join(base, name) });
      }
    }

    if (dirs.length === 0) {
      return { content: [{ type: "text", text: "No plugins found in the marketplace." }] };
    }

    const results = await Promise.all(
      dirs.map(async ({ category, dir }) => {
        const result = await validatePlugin(dir);
        return { category, ...result };
      })
    );

    const lines = [`Marketplace validation — ${results.length} plugin(s)\n`];
    for (const r of results) {
      const status = r.valid ? "PASS" : "FAIL";
      lines.push(`[${status}] ${r.category}/${r.name}`);
      r.errors.forEach((e) => lines.push(`       ✗ ${e}`));
      r.warnings.forEach((w) => lines.push(`       ! ${w}`));
    }

    const passed = results.filter((r) => r.valid).length;
    lines.push("", `${passed}/${results.length} passed`);

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ── Tool: list_plugins ───────────────────────────────────────────────────────

server.tool(
  "list_plugins",
  "List all plugins in the marketplace with their status",
  {
    category: z
      .enum(["plugins", "community", "all"])
      .default("all")
      .describe("Which category to list"),
  },
  async ({ category }) => {
    const entries = [];

    const collect = async (label, base) => {
      for (const name of await listDirs(base)) {
        const dir = path.join(base, name);
        const manifestPath = path.join(dir, ".claude-plugin", "plugin.json");
        let manifest = null;
        try {
          manifest = await readJsonSafe(manifestPath);
        } catch (e) {
          console.error(`Warning: could not read ${manifestPath}: ${e.message}`);
        }

        const components = [];
        const checks = ["skills", "agents", "commands", "hooks", "templates", ".mcp.json"];
        for (const c of checks) {
          if (await fileExists(path.join(dir, c))) {
            components.push(c === ".mcp.json" ? "mcp" : c);
          }
        }

        entries.push({
          category: label,
          name,
          version: manifest?.version || "—",
          description: manifest?.description || "—",
          components,
        });
      }
    };

    if (category === "all" || category === "plugins") await collect("plugins", PLUGINS_DIR);
    if (category === "all" || category === "community") await collect("community", COMMUNITY_DIR);

    if (entries.length === 0) {
      return { content: [{ type: "text", text: "No plugins found." }] };
    }

    const lines = entries.map(
      (e) =>
        `${e.category}/${e.name} (v${e.version})\n  ${e.description}\n  components: ${e.components.length > 0 ? e.components.join(", ") : "none"}`
    );

    return { content: [{ type: "text", text: lines.join("\n\n") }] };
  }
);

// ── Tool: add_component ──────────────────────────────────────────────────────

server.tool(
  "add_component",
  "Add a skill, agent, command, hook, or template to an existing plugin",
  {
    plugin: z
      .string()
      .regex(KEBAB_CASE, "Must be kebab-case")
      .describe("Plugin name"),
    category: z
      .enum(["plugins", "community"])
      .default("plugins")
      .describe("Which directory the plugin is in"),
    component: z
      .enum(["skill", "agent", "command", "hook", "template"])
      .describe("Component type to add"),
    name: z
      .string()
      .regex(KEBAB_CASE, "Must be kebab-case")
      .describe("Component name (kebab-case)"),
    description: z.string().describe("Brief description of the component"),
  },
  async ({ plugin, category, component, name, description }) => {
    let dir;
    try {
      dir = pluginDir(category, plugin);
    } catch (e) {
      return { content: [{ type: "text", text: e.message }] };
    }

    if (!(await fileExists(dir))) {
      return {
        content: [{ type: "text", text: `Plugin '${plugin}' not found in ${category}/` }],
      };
    }

    let created = "";

    if (component === "skill") {
      const skillDir = path.join(dir, "skills", name);
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(
        path.join(skillDir, "SKILL.md"),
        `---\nname: ${name}\ndescription: ${description}\n---\n\n${description}\n`
      );
      created = `skills/${name}/SKILL.md`;
    } else if (component === "agent") {
      await fs.mkdir(path.join(dir, "agents"), { recursive: true });
      await fs.writeFile(
        path.join(dir, "agents", `${name}.md`),
        `---\nname: ${name}\ndescription: ${description}\nmodel: sonnet\n---\n\n${description}\n`
      );
      created = `agents/${name}.md`;
    } else if (component === "command") {
      await fs.mkdir(path.join(dir, "commands"), { recursive: true });
      await fs.writeFile(
        path.join(dir, "commands", `${name}.md`),
        `---\ndescription: ${description}\n---\n\n${description}\n`
      );
      created = `commands/${name}.md`;
    } else if (component === "hook") {
      const hooksDir = path.join(dir, "hooks");
      const hooksFile = path.join(hooksDir, "hooks.json");
      await fs.mkdir(hooksDir, { recursive: true });

      let config = { hooks: {} };
      try {
        const existing = await readJsonSafe(hooksFile);
        if (existing) config = existing;
      } catch (e) {
        console.error(`Warning: could not parse ${hooksFile}, starting fresh: ${e.message}`);
      }

      if (!config.hooks[name]) {
        config.hooks[name] = [
          {
            hooks: [
              {
                type: "prompt",
                prompt: description,
              },
            ],
          },
        ];
      }
      await fs.writeFile(hooksFile, JSON.stringify(config, null, 2) + "\n");
      created = `hooks/hooks.json (added '${name}' event)`;
    } else if (component === "template") {
      await fs.mkdir(path.join(dir, "templates"), { recursive: true });
      await fs.writeFile(
        path.join(dir, "templates", `${name}.md`),
        `---\nname: ${name}\ndescription: ${description}\n---\n\n${description}\n`
      );
      created = `templates/${name}.md`;
    }

    // Regenerate marketplace.json
    await regenerateMarketplaceJson();

    return {
      content: [
        {
          type: "text",
          text: `Added ${component} '${name}' to ${category}/${plugin}\n  → ${created}\n  marketplace.json updated`,
        },
      ],
    };
  }
);

// ── Tool: get_conventions ────────────────────────────────────────────────────

server.tool(
  "get_conventions",
  "Get the marketplace conventions and plugin structure requirements",
  {},
  async () => {
    const text = `# Marketplace Plugin Conventions

## Required files for every plugin
- README.md — Installation and usage instructions
- LICENSE — License file (default: MIT)
- .claude-plugin/plugin.json — Plugin manifest

## plugin.json required fields
- name (kebab-case, lowercase, hyphens only)

## plugin.json recommended fields
- description
- version (semver, e.g. "1.0.0")
- author.name
- license
- repository (URL, required for community plugins)

## Directory structure
\`\`\`
plugin-name/
├── .claude-plugin/
│   └── plugin.json          ← Only the manifest goes here
├── skills/                  ← Skill directories with SKILL.md
│   └── skill-name/
│       └── SKILL.md
├── agents/                  ← Agent markdown files
│   └── agent-name.md
├── commands/                ← Command markdown files
│   └── command-name.md
├── hooks/                   ← Hook configuration
│   └── hooks.json
├── templates/               ← Output template files
│   └── template-name.md
├── .mcp.json                ← MCP server config (optional)
├── .lsp.json                ← LSP server config (optional)
├── settings.json            ← Default settings (optional)
├── README.md
└── LICENSE
\`\`\`

## Key rules
- NEVER put commands/, agents/, skills/, hooks/, templates/ inside .claude-plugin/
- Only plugin.json goes inside .claude-plugin/
- Skills must be directories containing SKILL.md (not loose .md files)
- Agents are .md files with frontmatter (name, description, model)
- Commands are .md files with frontmatter (description)
- All paths in plugin.json must be relative and start with ./
- Use \${CLAUDE_PLUGIN_ROOT} for referencing plugin files in hooks/MCP configs
- Use \${CLAUDE_PLUGIN_DATA} for persistent data that survives updates

## Marketplace layout
- plugins/ — First-party plugins by our team
- community/ — Forked or linked third-party plugins (must include upstream URL)

## CI checks
Every plugin directory must contain: README.md, LICENSE, .claude-plugin/
`;

    return { content: [{ type: "text", text }] };
  }
);

// ── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
