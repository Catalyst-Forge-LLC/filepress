import { dev } from '$app/environment';

// Fully static site: prerender every route at build time (D2, adapter-static).
export const prerender = true;
export const trailingSlash = 'never';

// Production ships plain HTML (no hydration). That avoids intermittent SvelteKit
// "500 Internal Error" pages when CDN asset hashes race during deploys or when
// client navigation can't load __data.json. Keep CSR in `pnpm dev` for Genie.
export const csr = dev;
