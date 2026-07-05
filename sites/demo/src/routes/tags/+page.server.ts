import type { PageServerLoad } from './$types';
import { content } from '$lib/content.server';

export const load: PageServerLoad = () => ({ tags: content.getAllTags() });
