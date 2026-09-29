/**
 * Compact cards for xFacts labels that already live in a project repo.
 * The site reads *_FACTS.md at build time. It does not render a PNG.
 */
import matter from 'gray-matter';

export interface XFactsLabelCard {
	/** Path relative to the repository root, used as a stable key. */
	id: string;
	family: string;
	title: string;
	/** type, kind, or a short purpose. */
	detail: string;
	/** First few stack values, when the label has a stack map. */
	stack: string;
	/** status, when present. */
	meta: string;
	href: string;
	/** True when href is a portable /v# viewer URL from the label file. */
	viewer: boolean;
}

const FAMILIES: Record<string, { family: string; home: string }> = {
	APP: { family: 'AppFacts', home: 'https://appfacts.dev' },
	FEATURE: { family: 'FeatureFacts', home: 'https://featurefacts.dev' },
	TOOL: { family: 'ToolFacts', home: 'https://toolfacts.dev' },
	AGENT: { family: 'AgentFacts', home: 'https://agentfacts.dev' },
	SKILL: { family: 'SkillFacts', home: 'https://skillfacts.dev' },
	MODEL: { family: 'ModelFacts', home: 'https://modelfacts.dev' }
};

const FAMILY_ORDER = ['AppFacts', 'FeatureFacts', 'ToolFacts', 'AgentFacts', 'SkillFacts', 'ModelFacts'];

const VIEWER_RE = /https:\/\/[a-z0-9.-]+\/v#[^\s)>\]]+/i;

export function familyForFactsFile(filename: string): { family: string; home: string } {
	const stem = filename.replace(/_FACTS\.md$/i, '');
	const known = FAMILIES[stem.toUpperCase()];
	if (known) return known;
	const family = stem
		.toLowerCase()
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
	return { family: family || 'xFacts', home: '' };
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

function stackLine(stack: unknown): string {
	if (!stack || typeof stack !== 'object' || Array.isArray(stack)) return '';
	const values = Object.values(stack as Record<string, unknown>)
		.map((value) => (typeof value === 'string' ? value.trim() : ''))
		.filter((value) => value && value.toLowerCase() !== 'unknown');
	return values.slice(0, 3).join(' · ');
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

	const detail = oneLine(data.type) || oneLine(data.kind) || oneLine(data.purpose);
	const credits = asRecord(data.credits);
	const viewer = raw.match(VIEWER_RE)?.[0] ?? '';
	const href = viewer || httpUrl(credits.generated_with) || known.home;
	if (!href) return null;

	return {
		id,
		family: known.family,
		title,
		detail,
		stack: stackLine(data.stack),
		meta: oneLine(data.status, 40),
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
