// Fully static site: prerender every route at build time (D2, adapter-static).
export const prerender = true;
// No client-side router needed for a content site; keep shipped JS minimal.
export const trailingSlash = 'never';
