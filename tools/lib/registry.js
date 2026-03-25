/**
 * Shared registry generation logic.
 * Used by both the MCP server and the standalone generate-marketplace-json script.
 */

import fs from "fs/promises";
import path from "path";

export async function listDirs(base) {
  try {
    const entries = await fs.readdir(base, { withFileTypes: true });
    return entries.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}

export async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse .gitmodules to extract submodule path → URL mappings.
 * Returns e.g. { "community/claude": "https://github.com/markus41/claude" }
 */
export async function parseGitmodules(rootDir) {
  const gitmodulesPath = path.join(rootDir, ".gitmodules");
  try {
    const content = await fs.readFile(gitmodulesPath, "utf-8");
    const mapping = {};
    let currentPath = null;
    let currentUrl = null;

    for (const line of content.split("\n")) {
      const pathMatch = line.match(/^\s*path\s*=\s*(.+?)\s*$/);
      const urlMatch = line.match(/^\s*url\s*=\s*(.+?)\s*$/);

      if (pathMatch) currentPath = pathMatch[1];
      if (urlMatch) currentUrl = urlMatch[1];

      if (currentPath && currentUrl) {
        mapping[currentPath] = currentUrl;
        currentPath = null;
        currentUrl = null;
      }
    }

    return mapping;
  } catch {
    return {};
  }
}

const COMPONENT_TYPES = ["skills", "agents", "commands", "hooks", "templates"];

export { COMPONENT_TYPES };

export async function collectComponents(dir) {
  const components = {};
  for (const comp of COMPONENT_TYPES) {
    const compDir = path.join(dir, comp);
    if (!(await fileExists(compDir))) continue;
    const entries = await fs.readdir(compDir, { withFileTypes: true });
    const items =
      comp === "skills"
        ? entries.filter((e) => e.isDirectory()).map((e) => e.name)
        : comp === "hooks"
          ? entries.filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name)
          : entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name.replace(/\.md$/, ""));
    if (items.length > 0) components[comp] = items;
  }
  return components;
}

export async function collectPlugin(category, name, base) {
  const dir = path.join(base, name);
  const manifestPath = path.join(dir, ".claude-plugin", "plugin.json");

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  } catch {
    return null;
  }

  if (!manifest.name) return null;

  const components = await collectComponents(dir);

  const entry = {
    name: manifest.name,
    version: manifest.version || "0.0.0",
    description: manifest.description || "",
    category,
    path: `${category}/${name}`,
    components,
  };

  if (manifest.author?.name) entry.author = manifest.author.name;
  if (manifest.license) entry.license = manifest.license;
  if (manifest.keywords?.length) entry.keywords = manifest.keywords;
  if (manifest.repository) entry.repository = manifest.repository;

  return entry;
}

/**
 * Scan plugins/ and community/ directories and build the registry.
 * Returns { plugins, warnings } where warnings includes duplicate name detection.
 *
 * Community plugins are resolved to git-subdir sources using .gitmodules so that
 * users installing from the marketplace don't need to init submodules.
 */
export async function generateRegistry(pluginsDir, communityDir) {
  const plugins = {};
  const warnings = [];

  // Parse .gitmodules to resolve community submodule URLs
  const rootDir = path.dirname(pluginsDir);
  const submodules = await parseGitmodules(rootDir);

  // Scan top-level plugins/
  for (const name of await listDirs(pluginsDir)) {
    const entry = await collectPlugin("plugins", name, pluginsDir);
    if (!entry) continue;

    if (plugins[entry.name]) {
      warnings.push(
        `Duplicate plugin name "${entry.name}": ${plugins[entry.name].path} and ${entry.path}`
      );
    }
    plugins[entry.name] = entry;
  }

  // Scan community/ — each subdirectory is a submodule repo that may contain a plugins/ folder
  const warnedSubmodules = new Set();
  for (const repo of await listDirs(communityDir)) {
    const repoPluginsDir = path.join(communityDir, repo, "plugins");
    if (!(await fileExists(repoPluginsDir))) continue;

    const submodulePath = `community/${repo}`;
    const submoduleUrl = submodules[submodulePath];

    if (!submoduleUrl && !warnedSubmodules.has(submodulePath)) {
      warnings.push(
        `No .gitmodules entry for "${submodulePath}" — plugins in this repo will use a relative source path that requires submodule init`
      );
      warnedSubmodules.add(submodulePath);
    }

    for (const dirName of await listDirs(repoPluginsDir)) {
      const categoryPath = `community/${repo}/plugins`;
      const entry = await collectPlugin(categoryPath, dirName, repoPluginsDir);
      if (!entry) continue;

      // Attach upstream info so writeRegistry emits a git-subdir source
      if (submoduleUrl) {
        entry.upstream = {
          url: submoduleUrl,
          path: `plugins/${dirName}`,
        };
      }

      if (plugins[entry.name]) {
        warnings.push(
          `Duplicate plugin name "${entry.name}": ${plugins[entry.name].path} and ${entry.path}`
        );
      }
      plugins[entry.name] = entry;
    }
  }

  return { plugins, warnings };
}

/**
 * Write .claude-plugin/marketplace.json in Claude Code's expected schema.
 * Timestamp updates on every run so CI always produces a fresh commit.
 */
export async function writeRegistry(outputPath, plugins) {
  // Ensure parent directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const pluginArray = Object.values(plugins).map((entry) => {
    const plugin = {
      name: entry.name,
    };

    // Community plugins with upstream info use git-subdir so users don't need
    // to init submodules. First-party plugins use relative paths.
    if (entry.upstream) {
      plugin.source = {
        source: "git-subdir",
        url: entry.upstream.url,
        path: entry.upstream.path,
      };
    } else {
      plugin.source = `./${entry.path}`;
    }

    if (entry.description) plugin.description = entry.description;
    if (entry.version && entry.version !== "0.0.0") plugin.version = entry.version;
    if (entry.author) plugin.author = { name: entry.author };
    if (entry.license) plugin.license = entry.license;
    if (entry.keywords?.length) plugin.keywords = entry.keywords;
    if (entry.repository) plugin.repository = entry.repository;
    return plugin;
  });

  const registry = {
    name: "taia-marketplace",
    owner: { name: "Trusted American Insurance Agency" },
    metadata: {
      description: "Plugin registry for Claude Code",
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
    },
    plugins: pluginArray,
  };

  await fs.writeFile(outputPath, JSON.stringify(registry, null, 2) + "\n");
  return { count: pluginArray.length };
}
