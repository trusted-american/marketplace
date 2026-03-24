#!/usr/bin/env node

/**
 * Generates marketplace.json from all plugins in plugins/ and community/.
 * Run manually or via CI — the output is committed to the repo root.
 */

import path from "path";
import { fileURLToPath } from "url";
import { generateRegistry, writeRegistry } from "./lib/registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLUGINS_DIR = path.join(ROOT, "plugins");
const COMMUNITY_DIR = path.join(ROOT, "community");
const OUTPUT = path.join(ROOT, "marketplace.json");

async function generate() {
  const { plugins, warnings } = await generateRegistry(PLUGINS_DIR, COMMUNITY_DIR);

  for (const w of warnings) {
    console.warn(`WARNING: ${w}`);
  }

  const { count, changed } = await writeRegistry(OUTPUT, plugins);

  console.log(`marketplace.json: ${count} plugin(s) indexed${changed ? "" : " (unchanged)"}`);
  for (const [name, p] of Object.entries(plugins)) {
    console.log(`  ${p.category}/${name} v${p.version}`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
