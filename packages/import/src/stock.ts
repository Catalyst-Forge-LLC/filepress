import type { DesignBrief } from './ir.ts';

const OPENVERSE = 'https://api.openverse.org/v1/images/';
const UA = 'filepressImport/0.1 (+https://github.com/Catalyst-Forge-LLC/filepress)';

export type StockHit = {
	url: string;
	title: string;
	creator: string | null;
	license: string;
	licenseUrl: string;
	foreignLandingUrl: string;
	attribution: string;
	query: string;
};

type OpenverseResult = {
	url?: string;
	title?: string;
	creator?: string | null;
	license?: string;
	license_url?: string;
	foreign_landing_url?: string;
	attribution?: string;
	width?: number;
	height?: number;
	mature?: boolean;
};

/** Build stock search queries from the design brief (not inspiration site assets). */
export function stockQueriesForBrief(brief: DesignBrief, _author?: string): {
	background: string;
	header: string;
	hero: string;
} {
	const mode = brief.paletteMode || 'dark';
	// Keep queries short — Openverse ranks better on simple visual terms than mood essays.
	if (mode === 'dark') {
		return {
			background: 'abstract dark texture',
			header: 'dark abstract texture background',
			hero: 'dark abstract background'
		};
	}
	return {
		background: 'warm paper texture',
		header: 'soft light abstract',
		hero: 'neutral abstract background'
	};
}

function isUsableCover(r: OpenverseResult): boolean {
	if (!r.url || r.mature) return false;
	if (!/^https?:\/\//i.test(r.url)) return false;
	const blob = `${r.title || ''} ${r.url}`.toLowerCase();
	// Openverse is a mixed bag — reject obvious people/pop-culture dumps.
	if (
		/\b(spidey|spider-?man|thor|cosplay|comic-?con|wedding|selfie|portrait|headshot|meme|cartoon|anime|pokemon|marvel|disney)\b/.test(
			blob
		)
	) {
		return false;
	}
	// Prefer texture/atmosphere language in the title when present.
	return true;
}

function scoreCover(r: OpenverseResult): number {
	let score = 0;
	const title = (r.title || '').toLowerCase();
	const lic = (r.license || '').toLowerCase();
	if (lic === 'cc0' || lic === 'pdm') score += 50;
	else if (lic === 'by') score += 20;
	else if (lic.includes('sa')) score -= 30; // share-alike is awkward for site chrome
	if (/texture|abstract|background|gradient|bokeh|paper|grain|noise|dark/.test(title)) score += 25;
	const ratio = (r.width ?? 0) / Math.max(r.height ?? 1, 1);
	if (ratio >= 1.3) score += 15;
	if (/rawpixel|wikimedia|stocksnap/i.test(r.url || '')) score += 10;
	return score;
}

/** Public: search Openverse for a single cover-quality image. */
export async function searchStockImage(query: string): Promise<StockHit | null> {
	return searchOpenverse(query);
}

async function searchOpenverse(query: string): Promise<StockHit | null> {
	const trySearch = async (params: URLSearchParams) => {
		const res = await fetch(`${OPENVERSE}?${params}`, {
			headers: {
				'user-agent': UA,
				accept: 'application/json'
			}
		});
		if (!res.ok) {
			throw new Error(`Openverse search failed (${res.status}) for “${query}”`);
		}
		return (await res.json()) as { results?: OpenverseResult[] };
	};

	const attempts: URLSearchParams[] = [
		new URLSearchParams({
			q: query,
			page_size: '20',
			license: 'cc0,pdm',
			mature: 'false',
			category: 'photograph'
		}),
		new URLSearchParams({
			q: query,
			page_size: '20',
			license: 'cc0,pdm',
			mature: 'false'
		}),
		new URLSearchParams({
			q: query,
			page_size: '20',
			license_type: 'commercial',
			mature: 'false',
			category: 'photograph'
		})
	];

	const pool: OpenverseResult[] = [];
	for (const params of attempts) {
		try {
			const data = await trySearch(params);
			for (const r of data.results ?? []) {
				if (isUsableCover(r)) pool.push(r);
			}
			if (pool.length >= 4) break;
		} catch {
			/* try next */
		}
	}

	pool.sort((a, b) => scoreCover(b) - scoreCover(a));
	const best = pool[0];
	if (!best?.url) return null;

	return {
		url: best.url,
		title: best.title || 'Untitled',
		creator: best.creator ?? null,
		license: best.license || 'unknown',
		licenseUrl: best.license_url || '',
		foreignLandingUrl: best.foreign_landing_url || best.url,
		attribution:
			best.attribution ||
			`“${best.title || 'Untitled'}”${best.creator ? ` by ${best.creator}` : ''} (${best.license || 'license unknown'})`,
		query
	};
}

export type StockPlan = {
	images: NonNullable<DesignBrief['images']>;
	hits: Partial<Record<'background' | 'header' | 'hero', StockHit>>;
	notes: string[];
};

/**
 * Resolve CSS-cover slots from Openverse (CC commercial-friendly), not from --inspire pages.
 * Portrait/logo stay with the source-site harvest.
 */
export async function planStockCovers(
	brief: DesignBrief,
	opts?: { author?: string; includeHeader?: boolean; includeHero?: boolean }
): Promise<StockPlan> {
	const queries = stockQueriesForBrief(brief, opts?.author);
	const hits: StockPlan['hits'] = {};
	const notes: string[] = [
		'Chrome covers from Openverse (Creative Commons, commercial-friendly), not inspiration sites.'
	];
	const used = new Set<string>();

	const take = async (role: 'background' | 'header' | 'hero', query: string) => {
		try {
			const hit = await searchOpenverse(query);
			if (!hit || used.has(hit.url)) {
				notes.push(`- ${role}: no distinct stock hit for “${query}”`);
				return;
			}
			used.add(hit.url);
			hits[role] = hit;
			notes.push(
				`- ${role}: “${hit.title}” (${hit.license}) via Openverse — ${hit.foreignLandingUrl}`
			);
		} catch (e) {
			notes.push(
				`- ${role}: stock search failed — ${e instanceof Error ? e.message : String(e)}`
			);
		}
	};

	await take('background', queries.background);
	if (opts?.includeHeader !== false) await take('header', queries.header);
	if (opts?.includeHero) await take('hero', queries.hero);

	return {
		images: {
			background: hits.background?.url ?? null,
			header: hits.header?.url ?? null,
			hero: hits.hero?.url ?? null
		},
		hits,
		notes
	};
}

export function formatAttributionMarkdown(
	hits: StockPlan['hits']
): string {
	const lines = Object.entries(hits).map(([role, hit]) => {
		if (!hit) return '';
		return `- **${role}:** ${hit.attribution} — [source](${hit.foreignLandingUrl}) · [license](${hit.licenseUrl || hit.foreignLandingUrl})`;
	});
	return lines.filter(Boolean).join('\n');
}
