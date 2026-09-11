import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createContent } from './content';

describe('createContent', () => {
	it('treats a missing posts directory as no posts', () => {
		const api = createContent({
			contentDir: join(tmpdir(), `filepress-missing-posts-${Date.now()}`),
			listDrafts: false
		});
		expect(api.getPublishedPosts()).toEqual([]);
		expect(api.getListedPosts()).toEqual([]);
		expect(api.getBuildableSlugs()).toEqual([]);
	});
});
