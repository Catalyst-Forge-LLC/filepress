/**
 * Compact cards for xFacts labels that already live in a project repo.
 * The site reads *_FACTS.md at build time. It does not render a PNG.
 */
import matter from 'gray-matter';

export interface XFactsLabelPair {
	label: string;
	value: string;
}

export interface XFactsLabelCard {
	/** Path relative to the repository root, used as a stable key. */
	id: string;
	family: string;
	/** Viewer accent, used for the link line. */
	accent: string;
	title: string;
	serving: string;
	meta: XFactsLabelPair[];
	/** Stack rows, in file order. The last one draws the thick rule. */
	rows: XFactsLabelPair[];
	purpose: string;
	href: string;
	/** True when href is a portable /v# viewer URL from the label file. */
	viewer: boolean;
}

const FAMILIES: Record<string, { family: string; home: string; accent: string; serving: string }> = {
	APP: {
		family: 'AppFacts',
		home: 'https://appfacts.dev',
		accent: '#d96b2b',
		serving: 'Serving size: one repository · Read time: under a minute'
	},
	FEATURE: {
		family: 'FeatureFacts',
		home: 'https://featurefacts.dev',
		accent: '#818cf8',
		serving: 'Serving size: one product · Read time: under a minute'
	},
	TOOL: {
		family: 'ToolFacts',
		home: 'https://toolfacts.dev',
		accent: '#2dd4bf',
		serving: 'Serving size: one tool · Read time: under a minute'
	},
	AGENT: {
		family: 'AgentFacts',
		home: 'https://agentfacts.dev',
		accent: '#f6ad55',
		serving: 'Serving size: one agent · Read time: under a minute'
	},
	SKILL: {
		family: 'SkillFacts',
		home: 'https://skillfacts.dev',
		accent: '#f472b6',
		serving: 'Serving size: one skill · Read time: under a minute'
	},
	MODEL: {
		family: 'ModelFacts',
		home: 'https://modelfacts.dev',
		accent: '#38bdf8',
		serving: 'Serving size: one model · Read time: under a minute'
	}
};

const FAMILY_ORDER = ['AppFacts', 'FeatureFacts', 'ToolFacts', 'AgentFacts', 'SkillFacts', 'ModelFacts'];

const VIEWER_RE = /https:\/\/[a-z0-9.-]+\/v#[^\s)>\]]+/i;

export function familyForFactsFile(filename: string): {
	family: string;
	home: string;
	accent: string;
	serving: string;
} {
	const stem = filename.replace(/_FACTS\.md$/i, '');
	const known = FAMILIES[stem.toUpperCase()];
	if (known) return known;
	const family = stem
		.toLowerCase()
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
	return {
		family: family || 'xFacts',
		home: '',
		accent: '#d96b2b',
		serving: 'Serving size: one label · Read time: under a minute'
	};
}

function titleCase(key: string): string {
	return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function oneLine(value: unknown, max = 96): string {
	if (typeof value !== 'string') return '';
	const text = value.replace(/\s+/g, ' ').trim();
	if (!text) return '';
	if (text.length <= max) return text;
	const cut = text.slice(0, max - 1).replace(/\s+\S*$/, '').trim();
	return `${cut || text.slice(0, max - 1)}…`;
}

function httpUrl(value: unknown): string {
	if (typeof value !== 'string') return '';
	const text = value.trim();
	return /^https?:\/\//i.test(text) ? text : '';
}

function stackRows(stack: unknown): XFactsLabelPair[] {
	if (!stack || typeof stack !== 'object' || Array.isArray(stack)) return [];
	const rows: XFactsLabelPair[] = [];
	for (const [key, value] of Object.entries(stack as Record<string, unknown>)) {
		if (typeof value !== 'string') continue;
		const text = value.trim();
		if (!text || text.toLowerCase() === 'unknown') continue;
		rows.push({ label: titleCase(key), value: oneLine(text, 48) });
		if (rows.length === 8) break;
	}
	return rows;
}

function metaPairs(data: Record<string, unknown>): XFactsLabelPair[] {
	const pairs: XFactsLabelPair[] = [];
	const type = oneLine(data.type, 80);
	const kind = oneLine(data.kind, 80);
	if (type) pairs.push({ label: 'Type', value: type });
	else if (kind) pairs.push({ label: 'Kind', value: kind });
	const status = oneLine(data.status, 40);
	const license = oneLine(data.license, 40);
	if (status) pairs.push({ label: 'Status', value: status });
	if (license) pairs.push({ label: 'License', value: license });
	return pairs;
}

function asRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

/** Turn one label file into a card. Returns null when it has no name or no link. */
export function labelCardFromMarkdown(id: string, filename: string, raw: string): XFactsLabelCard | null {
	let data: Record<string, unknown>;
	try {
		data = asRecord(matter(raw).data);
	} catch {
		return null;
	}

	const known = familyForFactsFile(filename);
	const title = oneLine(data.name, 80);
	if (!title) return null;

	const credits = asRecord(data.credits);
	const viewer = raw.match(VIEWER_RE)?.[0] ?? '';
	const href = viewer || httpUrl(credits.generated_with) || known.home;
	if (!href) return null;

	return {
		id,
		family: known.family,
		accent: known.accent,
		title,
		serving: known.serving,
		meta: metaPairs(data),
		rows: stackRows(data.stack),
		purpose: oneLine(data.purpose, 180),
		href,
		viewer: Boolean(viewer)
	};
}

export function sortLabelCards(cards: XFactsLabelCard[]): XFactsLabelCard[] {
	return [...cards].sort((a, b) => {
		const ai = FAMILY_ORDER.indexOf(a.family);
		const bi = FAMILY_ORDER.indexOf(b.family);
		const ao = ai === -1 ? FAMILY_ORDER.length : ai;
		const bo = bi === -1 ? FAMILY_ORDER.length : bi;
		if (ao !== bo) return ao - bo;
		return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
	});
}
