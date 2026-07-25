import type { RequestHandler } from './$types';
import { buildRobotsTxt } from '@downpress/core/server';
import config from '$site-config';

export const prerender = true;

export const GET: RequestHandler = () => {
	return new Response(buildRobotsTxt(config), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
};
