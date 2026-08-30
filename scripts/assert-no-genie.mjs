/**
 * Fail a FilePress `build/` if Genie leaked into the static output.
 * Genie is serve-only (`filepress dev`). Production must not ship the panel,
 * its CSS/JS chunk names, or `/__filepress/genie` calls.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKERS = ['GeniePanel', 'GenieHost', 'genie-fab', '/__filepress/genie'];
const TEXT_EXT = new Set(['.html', '.js', '.css', '.json', '.txt', '.svg', '.xml']);

export function assertNoGenieInBuild(buildDir) {
	if (!existsSync(buildDir)) {
		throw new Error(`filepress: Genie leak check skipped — missing build dir ${buildDir}`);
	}
	const hits = [];
	walk(buildDir, (file) => {
		if (!TEXT_EXT.has(extname(file).toLowerCase())) return;
		const text = readFileSync(file, 'utf8');
		for (const marker of MARKERS) {
			if (text.includes(marker)) {
				hits.push(`${relative(buildDir, file)}: ${marker}`);
			}
		}
	});
	if (hits.length > 0) {
		throw new Error(
			`filepress: Genie leaked into the static build (dev-only).\n` +
				hits.map((h) => `  ${h}`).join('\n')
		);
	}
}

function walk(dir, visit) {
	for (const name of readdirSync(dir)) {
		const abs = join(dir, name);
		if (statSync(abs).isDirectory()) walk(abs, visit);
		else visit(abs);
	}
}

const isMain =
	Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
	try {
		assertNoGenieInBuild(process.argv[2] ?? '');
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
		process.exit(1);
	}
}
