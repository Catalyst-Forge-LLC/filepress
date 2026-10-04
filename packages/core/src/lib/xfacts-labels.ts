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
		serving: 'Serving size: one repository'
	},
	FEATURE: {
		family: 'FeatureFacts',
		home: 'https://featurefacts.dev',
		accent: '#818cf8',
		serving: 'Serving size: one product'
	},
	TOOL: {
		family: 'ToolFacts',
		home: 'https://toolfacts.dev',
		accent: '#2dd4bf',
		serving: 'Serving size: one tool'
	},
	AGENT: {
		family: 'AgentFacts',
		home: 'https://agentfacts.dev',
		accent: '#f6ad55',
		serving: 'Serving size: one agent'
	},
	SKILL: {
		family: 'SkillFacts',
		home: 'https://skillfacts.dev',
		accent: '#f472b6',
		serving: 'Serving size: one skill'
	},
	MODEL: {
		family: 'ModelFacts',
		home: 'https://modelfacts.dev',
		accent: '#38bdf8',
		serving: 'Serving size: one model'
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
		serving: 'Serving size: one label'
	};
}

function titleCase(key: string): string {
	return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Headings keep mixed case (AppLedger). An all-lowercase slug is title-cased. */
function displayName(name: string): string {
	if (/[A-Z]/.test(name)) return name;
	return name.replace(/[A-Za-z]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
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

function knownLine(value: unknown, max = 96): string {
	const text = oneLine(value, max);
	if (!text || text.toLowerCase() === 'unknown') return '';
	return text;
}

function metaPairs(data: Record<string, unknown>): XFactsLabelPair[] {
	const pairs: XFactsLabelPair[] = [];
	const type = knownLine(data.type, 80);
	const kind = knownLine(data.kind, 80);
	if (type) pairs.push({ label: 'Type', value: type });
	else if (kind) pairs.push({ label: 'Kind', value: kind });
	const status = knownLine(data.status, 40);
	const license = knownLine(data.license, 40);
	if (status) pairs.push({ label: 'Status', value: status });
	if (license) pairs.push({ label: 'License', value: license });
	return pairs;
}

function availabilityValue(item: Record<string, unknown>): string {
	const state = knownLine(item.availability, 40);
	if (state !== 'conditional') return state;
	const conditions = Array.isArray(item.conditions) ? item.conditions : [];
	const extra = conditions
		.map((condition) => knownLine(asRecord(condition).value, 40))
		.filter(Boolean);
	return extra.length ? `conditional · ${extra.join(' · ')}` : 'conditional';
}

/** Shared known values across a FeatureFacts selection. Unknown stays off the card. */
function featureRows(features: unknown): XFactsLabelPair[] {
	if (!Array.isArray(features) || !features.length) return [];
	const items = features.map((item) => asRecord(item));
	const names = items.map((item) => knownLine(item.name, 40)).filter(Boolean);
	const rows: XFactsLabelPair[] = [];
	if (names.length) rows.push({ label: 'Selected', value: oneLine(names.join(' · '), 96) });

	const shared = (pick: (item: Record<string, unknown>) => string): string => {
		const values = items.map((item) => pick(item));
		const present = values.filter(Boolean);
		if (!present.length || present.length !== items.length) return '';
		const unique = [...new Set(present)];
		return unique.length === 1 ? unique[0] : 'mixed';
	};

	const fields: Array<[string, (item: Record<string, unknown>) => string]> = [
		['Lifecycle', (item) => knownLine(item.lifecycle, 40)],
		['Availability', availabilityValue],
		['Maturity', (item) => knownLine(item.maturity, 40)],
		['Documentation', (item) => knownLine(item.documentation, 40)],
		['Tests', (item) => knownLine(item.tests, 40)],
		['Evidence', (item) => knownLine(item.evidence_state, 40)]
	];
	for (const [label, pick] of fields) {
		const value = shared(pick);
		if (value) rows.push({ label, value });
		if (rows.length === 8) break;
	}
	return rows;
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
	const title = displayName(oneLine(data.name, 80));
	if (!title) return null;

	const credits = asRecord(data.credits);
	const viewer = raw.match(VIEWER_RE)?.[0] ?? '';
	const href = viewer || httpUrl(credits.generated_with) || known.home;
	if (!href) return null;
	const stack = stackRows(data.stack);

	return {
		id,
		family: known.family,
		accent: known.accent,
		title,
		serving: known.serving,
		meta: metaPairs(data),
		rows: stack.length ? stack : featureRows(data.features),
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
