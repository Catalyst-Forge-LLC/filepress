// Fully static site: prerender every route at build time (D2, adapter-static).
export const prerender = true;
export const trailingSlash = 'never';

// Production ships plain HTML (no hydration). Use Vite's DEV flag — not
// `$app/environment` `dev` — so a static host cannot bake `csr: true` and
// hydrate Genie. Keep CSR in `filepress dev` for the local cockpit.
export const csr = import.meta.env.DEV;
