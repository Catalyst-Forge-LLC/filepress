/** Mirrors @filepress/import DesignBrief — kept local so the panel never pulls Node import code. */
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
	paletteMode?: 'dark' | 'light';
	fonts?: {
		serif: string;
		sans: string;
		mono: string;
		googleHref: string | null;
	};
	hero?: 'editorial' | 'bold';
	atmosphere?: 'none' | 'noise';
	navStyle?: 'soft' | 'uppercase-tracked';
	elevatedCards?: boolean;
	images?: {
		hero?: string | null;
		header?: string | null;
		background?: string | null;
		logo?: string | null;
		portrait?: string | null;
	};
	cssNotes: string[];
};

export type GenieVersionMeta = {
	id: string;
	createdAt: string;
	parentId: string | null;
	label: string;
	starred: boolean;
	prompt: string;
	steers: Array<Record<string, unknown>>;
	inspireUrls: string[];
	llm: { used: boolean; model: string | null; host: string | null };
};

export type GenieActive = {
	versionId: string;
	activatedAt: string;
};

export type GenieSteerPatch = {
	label?: string;
	prompt?: string;
	brief?: Partial<DesignBrief>;
	activate?: boolean;
};
