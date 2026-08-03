import TurndownService from 'turndown';

const turndown = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	bulletListMarker: '-'
});

turndown.addRule('dropScriptStyle', {
	filter: ['script', 'style', 'noscript', 'iframe'],
	replacement: () => ''
});

/** Convert an HTML fragment to Markdown. Deterministic — no LLM. */
export function htmlToMarkdown(html: string): string {
	const md = turndown.turndown(html);
	return md
		.replace(/\n{3,}/g, '\n\n')
		.replace(/[ \t]+\n/g, '\n')
		.trim();
}
