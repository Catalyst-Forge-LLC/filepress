import type { DesignBrief, GenieVersionMeta } from './types.ts';

/** Original author prompt, including older snapshots that only stored it on the steer. */
export function versionPrompt(meta: Pick<GenieVersionMeta, 'prompt' | 'steers'>): string {
	const direct = meta.prompt?.trim();
	if (direct) return direct;
	for (const steer of meta.steers || []) {
		if (typeof steer.prompt === 'string' && steer.prompt.trim()) return steer.prompt.trim();
	}
	return '';
}

/** One line: mood, palette, colors, structure — what the snapshot actually applied. */
export function summarizeVersionDid(brief: DesignBrief | null | undefined): string {
	if (!brief) return '';
	const parts: string[] = [];
	const mood = brief.mood?.trim();
	if (mood) parts.push(mood);
	if (brief.paletteMode) parts.push(brief.paletteMode);
	const bg = brief.tokens?.bg?.trim();
	const accent = brief.tokens?.accent?.trim();
	if (bg) parts.push(bg);
	if (accent) parts.push(accent);
	if (brief.hero) parts.push(brief.hero);
	if (brief.atmosphere && brief.atmosphere !== 'none') parts.push(brief.atmosphere);
	if (brief.density) parts.push(brief.density);
	const serif = brief.fonts?.serif?.trim();
	const sans = brief.fonts?.sans?.trim();
	if (serif && sans) parts.push(`${serif} / ${sans}`);
	return parts.join(' · ');
}
