/**
 * A tiny rehype transform: a paragraph whose only meaningful child is an image
 * becomes a `<figure>`, and the image's `title` (falling back to `alt`) becomes
 * a `<figcaption>`. This gives Ben Evans–style captioned images from plain
 * Markdown (`![alt](src "Caption")`) with no new authoring syntax.
 *
 * Kept dependency-free (no unist-util-visit) so the content pipeline stays lean
 * and easy to unit-test.
 */

interface HastNode {
	type: string;
	tagName?: string;
	value?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
}

function isWhitespaceText(node: HastNode): boolean {
	return node.type === 'text' && (node.value ?? '').trim() === '';
}

/** The single <img> element inside a node's children, or null if it isn't image-only. */
function loneImage(children: HastNode[]): HastNode | null {
	const meaningful = children.filter((c) => !isWhitespaceText(c));
	if (meaningful.length !== 1) return null;
	const only = meaningful[0];
	if (only.type === 'element' && only.tagName === 'img') return only;
	// Support a linked image: <a><img/></a>
	if (
		only.type === 'element' &&
		only.tagName === 'a' &&
		only.children &&
		only.children.length === 1 &&
		only.children[0].type === 'element' &&
		only.children[0].tagName === 'img'
	) {
		return only.children[0];
	}
	return null;
}

function captionText(img: HastNode): string {
	const props = img.properties ?? {};
	const title = typeof props.title === 'string' ? props.title.trim() : '';
	if (title) return title;
	const alt = typeof props.alt === 'string' ? props.alt.trim() : '';
	return alt;
}

export function rehypeFigure() {
	return (tree: HastNode) => {
		const children = tree.children;
		if (!children) return;
		for (let i = 0; i < children.length; i++) {
			const node = children[i];
			if (node.type !== 'element' || node.tagName !== 'p' || !node.children) continue;
			const img = loneImage(node.children);
			if (!img) continue;

			const caption = captionText(img);
			const figureChildren: HastNode[] = [...node.children];
			if (caption) {
				figureChildren.push({
					type: 'element',
					tagName: 'figcaption',
					properties: {},
					children: [{ type: 'text', value: caption }]
				});
			}
			children[i] = {
				type: 'element',
				tagName: 'figure',
				properties: {},
				children: figureChildren
			};
		}
	};
}
