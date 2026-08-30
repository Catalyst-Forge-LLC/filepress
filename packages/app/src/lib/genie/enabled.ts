/**
 * Genie is a local `filepress dev` cockpit. Production / preview / prerender
 * must never mount it — the APIs live on the Vite serve plugin only.
 */
export function shouldMountGenie(input: { browser: boolean; viteDev: boolean }): boolean {
	return input.browser && input.viteDev;
}
