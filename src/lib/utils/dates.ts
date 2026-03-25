/**
 * Returns all Saturday dates (ISO YYYY-MM-DD) between startDate and endDate inclusive.
 */
export function getSaturdaysBetween(startDate: string, endDate: string): string[] {
	const saturdays: string[] = [];
	const start = new Date(startDate + 'T00:00:00Z');
	const end = new Date(endDate + 'T00:00:00Z');

	// Advance to first Saturday (day 6)
	const current = new Date(start);
	const dayOfWeek = current.getUTCDay();
	const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
	current.setUTCDate(current.getUTCDate() + daysUntilSaturday);

	while (current <= end) {
		saturdays.push(current.toISOString().split('T')[0]);
		current.setUTCDate(current.getUTCDate() + 7);
	}

	return saturdays;
}

/**
 * Returns the Nth Saturday of August for a given year (ISO YYYY-MM-DD).
 * n=1 → 1st Saturday, n=2 → 2nd, n=3 → 3rd, etc.
 */
export function getNthSaturdayOfAugust(year: number, n: number): string {
	const aug1 = new Date(Date.UTC(year, 7, 1)); // August 1st
	const dayOfWeek = aug1.getUTCDay();
	const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
	const firstSaturday = 1 + daysUntilSaturday;
	const day = firstSaturday + (n - 1) * 7;
	const date = new Date(Date.UTC(year, 7, day));
	return date.toISOString().split('T')[0];
}

const frDateFormatter = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'short',
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC'
});

/**
 * Format a date like "sam. 5 sept. 2026"
 */
export function formatSamedi(isoDate: string): string {
	const date = new Date(isoDate + 'T00:00:00Z');
	return frDateFormatter.format(date);
}

/**
 * Returns today's date as ISO YYYY-MM-DD
 */
export function today(): string {
	return new Date().toISOString().split('T')[0];
}

const frMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

/**
 * Format a date like "MARS 2026"
 */
export function formatMonth(isoDate: string): string {
	const date = new Date(isoDate + 'T00:00:00Z');
	return frMonthFormatter.format(date).toUpperCase();
}

const frDayFormatter = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'long',
	timeZone: 'UTC'
});

/**
 * Format a date like "6 mars"
 */
export function formatDay(isoDate: string): string {
	const date = new Date(isoDate + 'T00:00:00Z');
	return frDayFormatter.format(date);
}

/**
 * Returns the number of days until the given date (0 = today, negative = past)
 */
export function daysUntil(isoDate: string): number {
	const target = new Date(isoDate + 'T00:00:00Z');
	const now = new Date(today() + 'T00:00:00Z');
	return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
