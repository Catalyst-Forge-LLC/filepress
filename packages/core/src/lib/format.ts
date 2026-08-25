const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/**
 * Format a strict YYYY-MM-DD string as "4 July 2026". Parsed as UTC parts so the
 * displayed date never shifts by a day due to the runner's timezone (see the
 * SSR-vs-build Date lesson) — and since the site is fully prerendered, this is
 * computed once at build time.
 */
export function formatDate(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** ~228 wpm (adult silent reading). Always at least one minute for a published post. */
export function readingMinutes(body: string, wordsPerMinute = 228): number {
	const words = body.trim().split(/\s+/).filter(Boolean).length;
	if (words === 0) return 1;
	return Math.max(1, Math.round(words / wordsPerMinute));
}

export function formatReadingTime(minutes: number): string {
	return minutes === 1 ? '1 min read' : `${minutes} min read`;
}
