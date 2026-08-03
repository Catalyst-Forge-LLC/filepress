/** Intermediate representation for a crawled site → Downpress write. */

export type SiteIRPost = {
	slug: string;
	title: string;
	date: string;
	tags: string[];
	description: string | null;
	markdown: string;
	sourceUrl: string;
	/** Absolute image URLs discovered in the body (same-origin preferred). */
	imageUrls: string[];
};

export type SiteIRPage = {
	slug: string;
	title: string;
	description: string | null;
	markdown: string;
	sourceUrl: string;
	order: number;
	imageUrls: string[];
};

export type SiteIR = {
	source: { url: string; generator: string | null };
	identity: {
		title: string;
		description: string;
		author: string;
		canonicalUrl: string;
	};
	posts: SiteIRPost[];
	pages: SiteIRPage[];
	nav: Array<{ label: string; href: string }>;
	topics: Array<{ label: string; tag: string }>;
	/** Suggested lede for the Downpress index (from home bio), or null. */
	lede: string | null;
	/** Notes for the import report (URL remaps, skips). */
	notes: string[];
	/** Same-origin chrome assets to copy into static/ (favicons, etc.). */
	assets: string[];
};

export type DesignBrief = {
	mood: string;
	do: string[];
	dont: string[];
	tokens: {
		accent: string;
		accentStrong: string;
		bg?: string;
		ink?: string;
		inkSoft?: string;
		surface?: string;
		rule?: string;
		ruleStrong?: string;
		accentWash?: string;
	};
	density: 'sparse' | 'balanced' | 'dense';
	/** When set, theme generator punches up structure — not just token swaps. */
	paletteMode?: 'dark' | 'light';
	fonts?: {
		serif: string;
		sans: string;
		mono: string;
		/** Full Google Fonts CSS2 URL, or null to skip remote fonts. */
		googleHref: string | null;
	};
	hero?: 'editorial' | 'bold';
	atmosphere?: 'none' | 'noise';
	navStyle?: 'soft' | 'uppercase-tracked';
	elevatedCards?: boolean;
	/** Local static paths after fetch (e.g. /images/hero.jpg). Portraits are never CSS covers. */
	images?: {
		hero?: string | null;
		header?: string | null;
		background?: string | null;
		logo?: string | null;
		/** Author/headshot — kept for authors; not applied as a background. */
		portrait?: string | null;
	};
	cssNotes: string[];
};

export type ImageCandidate = {
	url: string;
	role: 'hero' | 'header' | 'background' | 'logo' | 'portrait' | 'other';
	source: string;
	alt?: string;
};

export type ImportOptions = {
	source: string;
	inspire: string[];
	out: string;
	siteName: string;
	title?: string;
	author?: string;
	canonicalUrl?: string;
	ollamaHost: string;
	ollamaModel: string;
	noLlm: boolean;
	dryRun: boolean;
	force: boolean;
	/** Download suggested hero/header/bg images into static/images/. */
	fetchImages: boolean;
	engineRoot: string;
};
