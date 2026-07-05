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
