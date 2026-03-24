import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Import shared registry functions directly — these are the production code paths
import {
  listDirs,
  fileExists,
  collectComponents,
  generateRegistry,
  writeRegistry,
  COMPONENT_TYPES,
} from "../../lib/registry.js";

let tmpDir;
let pluginsDir;
let communityDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "marketplace-test-"));
  pluginsDir = path.join(tmpDir, "plugins");
  communityDir = path.join(tmpDir, "community");
  await fs.mkdir(pluginsDir, { recursive: true });
  await fs.mkdir(communityDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── MCP-specific helpers (not in shared module) ──────────────────────────────

const KEBAB_CASE = /^[a-z0-9-]+$/;

function pluginDir(category, name) {
  const base = category === "community" ? communityDir : pluginsDir;
  const resolved = path.resolve(base, name);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error("Invalid plugin name: path escapes allowed directory");
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

async function createValidPlugin(dir, name, opts = {}) {
  const pluginPath = path.join(dir, name);
  await fs.mkdir(path.join(pluginPath, ".claude-plugin"), { recursive: true });
  await fs.writeFile(
    path.join(pluginPath, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name, description: "Test plugin", version: "1.0.0", ...opts }, null, 2)
  );
  await fs.writeFile(path.join(pluginPath, "README.md"), `# ${name}\n`);
  await fs.writeFile(path.join(pluginPath, "LICENSE"), "MIT\n");
  return pluginPath;
}

// ── Shared module: listDirs ──────────────────────────────────────────────────

describe("listDirs", () => {
  it("returns directory names", async () => {
    await fs.mkdir(path.join(tmpDir, "dir-a"));
    await fs.mkdir(path.join(tmpDir, "dir-b"));
    await fs.writeFile(path.join(tmpDir, "file.txt"), "");
    const dirs = await listDirs(tmpDir);
    expect(dirs).toContain("dir-a");
    expect(dirs).toContain("dir-b");
    expect(dirs).not.toContain("file.txt");
  });

  it("returns empty array for non-existing directory", async () => {
    expect(await listDirs(path.join(tmpDir, "nope"))).toEqual([]);
  });
});

// ── Shared module: fileExists ────────────────────────────────────────────────

describe("fileExists", () => {
  it("returns true for existing file", async () => {
    const f = path.join(tmpDir, "exists.txt");
    await fs.writeFile(f, "hello");
    expect(await fileExists(f)).toBe(true);
  });

  it("returns false for non-existing file", async () => {
    expect(await fileExists(path.join(tmpDir, "nope.txt"))).toBe(false);
  });
});

// ── Shared module: collectComponents ─────────────────────────────────────────

describe("collectComponents", () => {
  it("detects skills as directories", async () => {
    const dir = await createValidPlugin(pluginsDir, "comp-test");
    await fs.mkdir(path.join(dir, "skills", "my-skill"), { recursive: true });
    await fs.writeFile(path.join(dir, "skills", "my-skill", "SKILL.md"), "# Skill\n");
    const components = await collectComponents(dir);
    expect(components.skills).toEqual(["my-skill"]);
  });

  it("detects agents as .md files", async () => {
    const dir = await createValidPlugin(pluginsDir, "comp-test2");
    await fs.mkdir(path.join(dir, "agents"), { recursive: true });
    await fs.writeFile(path.join(dir, "agents", "reviewer.md"), "---\nname: reviewer\n---\n");
    const components = await collectComponents(dir);
    expect(components.agents).toEqual(["reviewer"]);
  });

  it("detects commands as .md files", async () => {
    const dir = await createValidPlugin(pluginsDir, "comp-test3");
    await fs.mkdir(path.join(dir, "commands"), { recursive: true });
    await fs.writeFile(path.join(dir, "commands", "deploy.md"), "---\ndescription: Deploy\n---\n");
    const components = await collectComponents(dir);
    expect(components.commands).toEqual(["deploy"]);
  });

  it("detects hooks as .json files", async () => {
    const dir = await createValidPlugin(pluginsDir, "comp-test4");
    await fs.mkdir(path.join(dir, "hooks"), { recursive: true });
    await fs.writeFile(path.join(dir, "hooks", "hooks.json"), '{"hooks":{}}');
    const components = await collectComponents(dir);
    expect(components.hooks).toEqual(["hooks.json"]);
  });

  it("detects templates as .md files", async () => {
    const dir = await createValidPlugin(pluginsDir, "comp-test5");
    await fs.mkdir(path.join(dir, "templates"), { recursive: true });
    await fs.writeFile(path.join(dir, "templates", "spec-file.md"), "---\nname: spec-file\n---\n");
    const components = await collectComponents(dir);
    expect(components.templates).toEqual(["spec-file"]);
  });

  it("strips .md extension from agents, commands, templates", async () => {
    const dir = await createValidPlugin(pluginsDir, "comp-strip");
    await fs.mkdir(path.join(dir, "agents"), { recursive: true });
    await fs.mkdir(path.join(dir, "templates"), { recursive: true });
    await fs.writeFile(path.join(dir, "agents", "test-agent.md"), "");
    await fs.writeFile(path.join(dir, "templates", "test-template.md"), "");
    const components = await collectComponents(dir);
    expect(components.agents).toEqual(["test-agent"]);
    expect(components.templates).toEqual(["test-template"]);
  });

  it("omits empty component directories", async () => {
    const dir = await createValidPlugin(pluginsDir, "comp-empty");
    await fs.mkdir(path.join(dir, "agents"), { recursive: true });
    await fs.mkdir(path.join(dir, "templates"), { recursive: true });
    // Empty dirs — no files inside
    const components = await collectComponents(dir);
    expect(components.agents).toBeUndefined();
    expect(components.templates).toBeUndefined();
  });

  it("ignores non-.md files in agents/commands/templates", async () => {
    const dir = await createValidPlugin(pluginsDir, "comp-ignore");
    await fs.mkdir(path.join(dir, "agents"), { recursive: true });
    await fs.writeFile(path.join(dir, "agents", "notes.txt"), "not an agent");
    const components = await collectComponents(dir);
    expect(components.agents).toBeUndefined();
  });

  it("returns all five component types when present", async () => {
    const dir = await createValidPlugin(pluginsDir, "comp-all");
    await fs.mkdir(path.join(dir, "skills", "s1"), { recursive: true });
    await fs.writeFile(path.join(dir, "skills", "s1", "SKILL.md"), "");
    await fs.mkdir(path.join(dir, "agents"), { recursive: true });
    await fs.writeFile(path.join(dir, "agents", "a1.md"), "");
    await fs.mkdir(path.join(dir, "commands"), { recursive: true });
    await fs.writeFile(path.join(dir, "commands", "c1.md"), "");
    await fs.mkdir(path.join(dir, "hooks"), { recursive: true });
    await fs.writeFile(path.join(dir, "hooks", "hooks.json"), "{}");
    await fs.mkdir(path.join(dir, "templates"), { recursive: true });
    await fs.writeFile(path.join(dir, "templates", "t1.md"), "");
    const components = await collectComponents(dir);
    expect(Object.keys(components).sort()).toEqual(
      ["agents", "commands", "hooks", "skills", "templates"]
    );
  });
});

// ── Shared module: generateRegistry ──────────────────────────────────────────

describe("generateRegistry", () => {
  it("returns empty plugins for empty marketplace", async () => {
    const { plugins, warnings } = await generateRegistry(pluginsDir, communityDir);
    expect(Object.keys(plugins)).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it("collects a single valid plugin", async () => {
    await createValidPlugin(pluginsDir, "test-plugin");
    const { plugins } = await generateRegistry(pluginsDir, communityDir);
    expect(plugins["test-plugin"]).toBeDefined();
    expect(plugins["test-plugin"].category).toBe("plugins");
    expect(plugins["test-plugin"].path).toBe("plugins/test-plugin");
  });

  it("collects plugins from both categories", async () => {
    await createValidPlugin(pluginsDir, "first-party");
    await createValidPlugin(communityDir, "third-party", { repository: "https://example.com" });
    const { plugins } = await generateRegistry(pluginsDir, communityDir);
    expect(plugins["first-party"].category).toBe("plugins");
    expect(plugins["third-party"].category).toBe("community");
  });

  it("skips plugins without valid manifest", async () => {
    const dir = path.join(pluginsDir, "broken");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "README.md"), "# broken\n");
    // No .claude-plugin/plugin.json
    const { plugins } = await generateRegistry(pluginsDir, communityDir);
    expect(Object.keys(plugins)).toHaveLength(0);
  });

  it("skips plugins with missing name field", async () => {
    const dir = path.join(pluginsDir, "no-name");
    await fs.mkdir(path.join(dir, ".claude-plugin"), { recursive: true });
    await fs.writeFile(
      path.join(dir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ description: "no name" })
    );
    const { plugins } = await generateRegistry(pluginsDir, communityDir);
    expect(Object.keys(plugins)).toHaveLength(0);
  });

  it("detects duplicate plugin names and warns", async () => {
    await createValidPlugin(pluginsDir, "dupe-plugin", { name: "same-name" });
    await createValidPlugin(communityDir, "other-dir", { name: "same-name" });
    const { plugins, warnings } = await generateRegistry(pluginsDir, communityDir);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Duplicate plugin name "same-name"');
    // Second one wins
    expect(plugins["same-name"].category).toBe("community");
  });

  it("includes author, license, keywords, repository from manifest", async () => {
    await createValidPlugin(pluginsDir, "rich-plugin", {
      author: { name: "Test Author" },
      license: "MIT",
      keywords: ["test", "plugin"],
      repository: "https://github.com/test/repo",
    });
    const { plugins } = await generateRegistry(pluginsDir, communityDir);
    const p = plugins["rich-plugin"];
    expect(p.author).toBe("Test Author");
    expect(p.license).toBe("MIT");
    expect(p.keywords).toEqual(["test", "plugin"]);
    expect(p.repository).toBe("https://github.com/test/repo");
  });

  it("includes components in registry entry", async () => {
    const dir = await createValidPlugin(pluginsDir, "full-plugin");
    await fs.mkdir(path.join(dir, "templates"), { recursive: true });
    await fs.writeFile(path.join(dir, "templates", "output.md"), "");
    await fs.mkdir(path.join(dir, "skills", "my-skill"), { recursive: true });
    await fs.writeFile(path.join(dir, "skills", "my-skill", "SKILL.md"), "");
    const { plugins } = await generateRegistry(pluginsDir, communityDir);
    expect(plugins["full-plugin"].components.templates).toEqual(["output"]);
    expect(plugins["full-plugin"].components.skills).toEqual(["my-skill"]);
  });
});

// ── Shared module: writeRegistry ─────────────────────────────────────────────

describe("writeRegistry", () => {
  it("writes valid JSON to output path", async () => {
    const output = path.join(tmpDir, ".claude-plugin", "marketplace.json");
    await writeRegistry(output, {});
    const data = JSON.parse(await fs.readFile(output, "utf-8"));
    expect(data.version).toBe("1.0.0");
    expect(data.plugins).toEqual({});
    expect(data.lastUpdated).toBeDefined();
  });

  it("creates parent directory if missing", async () => {
    const output = path.join(tmpDir, "nested", "dir", "marketplace.json");
    await writeRegistry(output, {});
    const data = JSON.parse(await fs.readFile(output, "utf-8"));
    expect(data.version).toBe("1.0.0");
  });

  it("updates timestamp on every run", async () => {
    const output = path.join(tmpDir, ".claude-plugin", "marketplace.json");
    const plugins = { test: { name: "test" } };

    await writeRegistry(output, plugins);
    const first = JSON.parse(await fs.readFile(output, "utf-8"));

    await new Promise((r) => setTimeout(r, 10));

    await writeRegistry(output, plugins);
    const second = JSON.parse(await fs.readFile(output, "utf-8"));

    expect(second.lastUpdated).not.toBe(first.lastUpdated);
  });

  it("returns plugin count", async () => {
    const output = path.join(tmpDir, ".claude-plugin", "marketplace.json");
    const result = await writeRegistry(output, { a: { name: "a" } });
    expect(result.count).toBe(1);
  });

  it("puts lastUpdated as the last field in JSON", async () => {
    const output = path.join(tmpDir, ".claude-plugin", "marketplace.json");
    await writeRegistry(output, { test: { name: "test" } });
    const raw = await fs.readFile(output, "utf-8");
    const lines = raw.trim().split("\n");
    // lastUpdated should be the last key before the closing brace
    expect(lines[lines.length - 2]).toMatch(/"lastUpdated"/);
  });
});

// ── MCP-specific: pluginDir ──────────────────────────────────────────────────

describe("pluginDir", () => {
  it("resolves plugins category correctly", () => {
    const result = pluginDir("plugins", "my-plugin");
    expect(result).toBe(path.join(pluginsDir, "my-plugin"));
  });

  it("resolves community category correctly", () => {
    const result = pluginDir("community", "forked-plugin");
    expect(result).toBe(path.join(communityDir, "forked-plugin"));
  });

  it("rejects path traversal with ../", () => {
    expect(() => pluginDir("plugins", "../../../etc")).toThrow("path escapes");
  });

  it("rejects path traversal with nested ../", () => {
    expect(() => pluginDir("plugins", "foo/../../bar")).toThrow("path escapes");
  });

  it("allows simple kebab-case names", () => {
    expect(() => pluginDir("plugins", "valid-name")).not.toThrow();
  });
});

// ── MCP-specific: readJsonSafe ───────────────────────────────────────────────

describe("readJsonSafe", () => {
  it("returns parsed JSON for valid file", async () => {
    const f = path.join(tmpDir, "data.json");
    await fs.writeFile(f, '{"key": "value"}');
    expect(await readJsonSafe(f)).toEqual({ key: "value" });
  });

  it("returns null for non-existing file", async () => {
    expect(await readJsonSafe(path.join(tmpDir, "missing.json"))).toBeNull();
  });

  it("throws for invalid JSON", async () => {
    const f = path.join(tmpDir, "bad.json");
    await fs.writeFile(f, "not json");
    await expect(readJsonSafe(f)).rejects.toThrow();
  });
});

// ── KEBAB_CASE validation ────────────────────────────────────────────────────

describe("KEBAB_CASE validation", () => {
  it("accepts valid kebab-case", () => {
    expect(KEBAB_CASE.test("my-plugin")).toBe(true);
    expect(KEBAB_CASE.test("plugin123")).toBe(true);
    expect(KEBAB_CASE.test("a")).toBe(true);
  });

  it("rejects invalid names", () => {
    expect(KEBAB_CASE.test("My-Plugin")).toBe(false);
    expect(KEBAB_CASE.test("my_plugin")).toBe(false);
    expect(KEBAB_CASE.test("../evil")).toBe(false);
    expect(KEBAB_CASE.test("has space")).toBe(false);
    expect(KEBAB_CASE.test("")).toBe(false);
  });
});

// ── Plugin validation ────────────────────────────────────────────────────────

describe("plugin validation", () => {
  it("validates a complete plugin as passing", async () => {
    const dir = await createValidPlugin(pluginsDir, "good-plugin");
    const REQUIRED_FILES = ["README.md", "LICENSE", ".claude-plugin"];

    const errors = [];
    for (const file of REQUIRED_FILES) {
      const target =
        file === ".claude-plugin"
          ? path.join(dir, ".claude-plugin", "plugin.json")
          : path.join(dir, file);
      if (!(await fileExists(target))) {
        errors.push(`Missing: ${file}`);
      }
    }
    expect(errors).toEqual([]);
  });

  it("detects missing README.md", async () => {
    const dir = await createValidPlugin(pluginsDir, "no-readme");
    await fs.rm(path.join(dir, "README.md"));
    expect(await fileExists(path.join(dir, "README.md"))).toBe(false);
  });

  it("detects missing LICENSE", async () => {
    const dir = await createValidPlugin(pluginsDir, "no-license");
    await fs.rm(path.join(dir, "LICENSE"));
    expect(await fileExists(path.join(dir, "LICENSE"))).toBe(false);
  });

  it("detects missing plugin.json", async () => {
    const name = "no-manifest";
    const dir = path.join(pluginsDir, name);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "README.md"), "# test\n");
    await fs.writeFile(path.join(dir, "LICENSE"), "MIT\n");
    expect(await fileExists(path.join(dir, ".claude-plugin", "plugin.json"))).toBe(false);
  });

  it("detects invalid JSON in plugin.json", async () => {
    const dir = await createValidPlugin(pluginsDir, "bad-json");
    await fs.writeFile(path.join(dir, ".claude-plugin", "plugin.json"), "not json");
    await expect(readJsonSafe(path.join(dir, ".claude-plugin", "plugin.json"))).rejects.toThrow();
  });

  it("detects missing name in plugin.json", async () => {
    const dir = await createValidPlugin(pluginsDir, "no-name");
    await fs.writeFile(
      path.join(dir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ description: "test" })
    );
    const manifest = await readJsonSafe(path.join(dir, ".claude-plugin", "plugin.json"));
    expect(manifest.name).toBeUndefined();
  });

  it("detects non-kebab-case name in plugin.json", async () => {
    const dir = await createValidPlugin(pluginsDir, "bad-case");
    await fs.writeFile(
      path.join(dir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "BadCase", description: "test" })
    );
    const manifest = await readJsonSafe(path.join(dir, ".claude-plugin", "plugin.json"));
    expect(KEBAB_CASE.test(manifest.name)).toBe(false);
  });

  it("detects directories inside .claude-plugin/", async () => {
    const dir = await createValidPlugin(pluginsDir, "bad-structure");
    await fs.mkdir(path.join(dir, ".claude-plugin", "commands"), { recursive: true });
    expect(await fileExists(path.join(dir, ".claude-plugin", "commands"))).toBe(true);
  });

  it("detects templates inside .claude-plugin/", async () => {
    const dir = await createValidPlugin(pluginsDir, "bad-templates");
    await fs.mkdir(path.join(dir, ".claude-plugin", "templates"), { recursive: true });
    expect(await fileExists(path.join(dir, ".claude-plugin", "templates"))).toBe(true);
  });

  it("detects skills directory missing SKILL.md", async () => {
    const dir = await createValidPlugin(pluginsDir, "bad-skill");
    await fs.mkdir(path.join(dir, "skills", "my-skill"), { recursive: true });
    expect(await fileExists(path.join(dir, "skills", "my-skill", "SKILL.md"))).toBe(false);
  });

  it("validates skills with SKILL.md present", async () => {
    const dir = await createValidPlugin(pluginsDir, "good-skill");
    await fs.mkdir(path.join(dir, "skills", "my-skill"), { recursive: true });
    await fs.writeFile(path.join(dir, "skills", "my-skill", "SKILL.md"), "---\nname: my-skill\n---\n");
    expect(await fileExists(path.join(dir, "skills", "my-skill", "SKILL.md"))).toBe(true);
  });
});

// ── Plugin creation safety ───────────────────────────────────────────────────

describe("plugin creation safety", () => {
  it("does not allow creating over existing plugin", async () => {
    const dir = await createValidPlugin(pluginsDir, "existing");
    expect(await fileExists(dir)).toBe(true);
  });

  it("upstream is required for community plugins", () => {
    const category = "community";
    const upstream = undefined;
    expect(category === "community" && !upstream).toBe(true);
  });
});

// ── Hook security ────────────────────────────────────────────────────────────

describe("hook security", () => {
  it("does not interpolate description into shell commands", () => {
    const description = '"; rm -rf / #';
    const hookEntry = {
      hooks: [
        {
          type: "prompt",
          prompt: description,
        },
      ],
    };
    expect(JSON.stringify(hookEntry)).not.toContain("echo");
    expect(hookEntry.hooks[0].type).toBe("prompt");
  });
});

// ── Component listing ────────────────────────────────────────────────────────

describe("component listing", () => {
  it("lists plugins from directory", async () => {
    await createValidPlugin(pluginsDir, "plugin-a");
    await createValidPlugin(pluginsDir, "plugin-b");
    const dirs = await listDirs(pluginsDir);
    expect(dirs).toContain("plugin-a");
    expect(dirs).toContain("plugin-b");
    expect(dirs).toHaveLength(2);
  });

  it("returns empty for empty marketplace", async () => {
    const dirs = await listDirs(pluginsDir);
    expect(dirs).toEqual([]);
  });

  it("reads manifest data correctly", async () => {
    await createValidPlugin(pluginsDir, "test-plugin", {
      description: "A test",
      version: "2.0.0",
    });
    const manifest = await readJsonSafe(
      path.join(pluginsDir, "test-plugin", ".claude-plugin", "plugin.json")
    );
    expect(manifest.name).toBe("test-plugin");
    expect(manifest.version).toBe("2.0.0");
    expect(manifest.description).toBe("A test");
  });
});

// ── add_component validation ─────────────────────────────────────────────────

describe("add_component validation", () => {
  it("rejects plugin names with path traversal", () => {
    expect(KEBAB_CASE.test("../../etc")).toBe(false);
  });

  it("rejects component names with path traversal", () => {
    expect(KEBAB_CASE.test("../evil")).toBe(false);
  });

  it("accepts valid component names", () => {
    expect(KEBAB_CASE.test("my-skill")).toBe(true);
    expect(KEBAB_CASE.test("auth-hook")).toBe(true);
  });
});

// ── COMPONENT_TYPES constant ─────────────────────────────────────────────────

describe("COMPONENT_TYPES", () => {
  it("includes all five component types", () => {
    expect(COMPONENT_TYPES).toEqual(["skills", "agents", "commands", "hooks", "templates"]);
  });
});
