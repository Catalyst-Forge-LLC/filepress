#!/usr/bin/env node
// Restore paths stashed by scripts/prepack.mjs after npm pack/publish.
import { existsSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bakRoot = join(root, '.npm-pack-bak');
const manifestPath = join(root, '.npm-pack-bak.json');

if (!existsSync(manifestPath)) {
	process.exit(0);
}

const { moved } = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const { from, to } of moved || []) {
	if (!existsSync(to)) continue;
	if (existsSync(from)) rmSync(from, { recursive: true, force: true });
	renameSync(to, from);
}

rmSync(manifestPath, { force: true });
if (existsSync(bakRoot)) rmSync(bakRoot, { recursive: true, force: true });
console.log(`postpack: restored ${(moved || []).length} path(s)`);
