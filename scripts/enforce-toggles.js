#!/usr/bin/env node
/**
 * CI enforcement for feature toggles.
 *
 * 1. Reads the source-of-truth manifest (valid toggle keys).
 * 2. Scans the codebase for useReleaseToggle('key') / useReleaseToggle("key").
 * 3. Warns (does not fail) if any used key is not in the manifest.
 *
 * Usage: node scripts/enforce-toggles.js
 * Optional: ENTITLEMENTS_MANIFEST=path/to/manifest.json node scripts/enforce-toggles.js
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MANIFEST_PATH =
  process.env.ENTITLEMENTS_MANIFEST ||
  join(ROOT, "config", "entitlements-manifest.json");
const SRC_DIR = join(ROOT, "src");

// Match useReleaseToggle('key'), useReleaseToggle("key"), useReleaseToggle(`key`)
const TOGGLE_CALL_RE = /useReleaseToggle\s*\(\s*['"`]([^'"`]+)['"`]/g;

function loadManifest() {
  try {
    const raw = readFileSync(MANIFEST_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : Object.keys(data);
  } catch (e) {
    console.error("Could not load manifest at", MANIFEST_PATH, e.message);
    process.exit(2);
  }
}

function* walkJsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") {
      yield* walkJsFiles(full);
    } else if (e.isFile() && /\.(jsx?|tsx?)$/.test(e.name)) {
      yield full;
    }
  }
}

function extractToggleKeysFromFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const keys = new Set();
  let m;
  while ((m = TOGGLE_CALL_RE.exec(content)) !== null) keys.add(m[1]);
  return keys;
}

function extractAllUsedKeys() {
  const used = new Set();
  for (const file of walkJsFiles(SRC_DIR)) {
    for (const key of extractToggleKeysFromFile(file)) used.add(key);
  }
  return used;
}

function main() {
  const defined = new Set(loadManifest());
  const used = extractAllUsedKeys();
  const unknown = [...used].filter((k) => !defined.has(k));

  if (unknown.length > 0) {
    console.warn("CI enforce toggles: used keys not in manifest:", unknown);
    return;
  }
  console.log("CI enforce toggles: all used toggle keys are defined.");
}

main();
