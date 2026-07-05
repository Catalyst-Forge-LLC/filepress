import { describe, it, expect } from 'vitest';
import { rehypeFigure } from './rehype-figure';

interface Node {
	type: string;
	tagName?: string;
	value?: string;
	properties?: Record<string, unknown>;
	children?: Node[];
}

const img = (props: Record<string, unknown>): Node => ({
	type: 'element',
	tagName: 'img',
	properties: props,
	children: []
});

const para = (children: Node[]): Node => ({
	type: 'element',
	tagName: 'p',
	properties: {},
	children
});

function run(tree: Node): Node {
	rehypeFigure()(tree);
	return tree;
}

describe('rehypeFigure', () => {
	it('wraps an image-only paragraph in a figure with a caption from the title', () => {
		const tree = run({ type: 'root', children: [para([img({ src: '/a.png', title: 'A view' })])] });
		const fig = tree.children![0];
		expect(fig.tagName).toBe('figure');
		const caption = fig.children!.find((c) => c.tagName === 'figcaption');
		expect(caption?.children?.[0].value).toBe('A view');
	});

	it('falls back to alt text when no title is present', () => {
		const tree = run({ type: 'root', children: [para([img({ src: '/a.png', alt: 'Alt caption' })])] });
		const caption = tree.children![0].children!.find((c) => c.tagName === 'figcaption');
		expect(caption?.children?.[0].value).toBe('Alt caption');
	});

	it('omits the figcaption when there is neither title nor alt', () => {
		const tree = run({ type: 'root', children: [para([img({ src: '/a.png' })])] });
		expect(tree.children![0].tagName).toBe('figure');
		expect(tree.children![0].children!.some((c) => c.tagName === 'figcaption')).toBe(false);
	});

	it('handles a linked image (a > img)', () => {
		const link: Node = {
			type: 'element',
			tagName: 'a',
			properties: { href: '/full.png' },
			children: [img({ src: '/thumb.png', title: 'Linked' })]
		};
		const tree = run({ type: 'root', children: [para([link])] });
		expect(tree.children![0].tagName).toBe('figure');
		const caption = tree.children![0].children!.find((c) => c.tagName === 'figcaption');
		expect(caption?.children?.[0].value).toBe('Linked');
	});

	it('leaves prose paragraphs (with text alongside an image) untouched', () => {
		const tree = run({
			type: 'root',
			children: [
				para([{ type: 'text', value: 'See ' }, img({ src: '/a.png', alt: 'x' })])
			]
		});
		expect(tree.children![0].tagName).toBe('p');
	});
});
