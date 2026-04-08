import type {
	Event,
	EventAssignment,
	Absence,
	SchoolPeriod,
	SaturdaySlot
} from '$lib/server/schema';
import { dateRangeOverlap, eachDateInRange } from './dates';

export interface DayEntries {
	periods: SchoolPeriod[];
	events: (Event & { memberIds: string[] })[];
	absences: Absence[];
	isSaturdayOpen: boolean;
}

export interface CalendarFilters {
	memberIds: Set<string>; // empty = all
	schoolIds: Set<string>; // empty = all
	showAccueils: boolean;
	showInternal: boolean;
	showAbsences: boolean;
	showPeriods: boolean;
}

export function emptyFilters(): CalendarFilters {
	return {
		memberIds: new Set(),
		schoolIds: new Set(),
		showAccueils: true,
		showInternal: true,
		showAbsences: true,
		showPeriods: true
	};
}

export function buildDayMap(
	dates: string[],
	source: {
		events: Event[];
		assignments: EventAssignment[];
		absences: Absence[];
		periods: SchoolPeriod[];
		saturdays: SaturdaySlot[];
	},
	filters: CalendarFilters
): Map<string, DayEntries> {
	const assignsByEvent = new Map<string, string[]>();
	for (const a of source.assignments) {
		if (!assignsByEvent.has(a.eventId)) assignsByEvent.set(a.eventId, []);
		assignsByEvent.get(a.eventId)!.push(a.memberId);
	}

	// Filter events
	const filteredEvents = source.events
		.filter((e) => {
			if (e.kind === 'accueil' && !filters.showAccueils) return false;
			if (e.kind === 'internal' && !filters.showInternal) return false;
			const memberIds = assignsByEvent.get(e.id) ?? [];
			if (filters.memberIds.size > 0) {
				if (!memberIds.some((m) => filters.memberIds.has(m))) return false;
			}
			if (filters.schoolIds.size > 0) {
				if (!e.schoolId || !filters.schoolIds.has(e.schoolId)) return false;
			}
			return true;
		})
		.map((e) => ({ ...e, memberIds: assignsByEvent.get(e.id) ?? [] }));

	// Filter absences
	const filteredAbsences = filters.showAbsences
		? source.absences.filter((a) => {
				if (a.status === 'rejected') return false;
				if (filters.memberIds.size > 0 && !filters.memberIds.has(a.memberId)) return false;
				return true;
			})
		: [];

	const filteredPeriods = filters.showPeriods ? source.periods : [];

	const map = new Map<string, DayEntries>();
	for (const date of dates) {
		map.set(date, {
			periods: filteredPeriods.filter((p) => dateRangeOverlap(date, date, p.startDate, p.endDate)),
			events: filteredEvents.filter((e) => e.date === date),
			absences: filteredAbsences.filter((a) => dateRangeOverlap(date, date, a.startDate, a.endDate)),
			isSaturdayOpen: source.saturdays.some((s) => s.date === date && !s.isClosed)
		});
	}
	return map;
}

/**
 * Build the 6×7 grid for a month: first Monday before/on the 1st, then 42 days.
 */
export function buildMonthGrid(month: string): string[] {
	const first = new Date(month + '-01T00:00:00Z');
	const firstDow = first.getUTCDay(); // 0 = sunday, 1 = monday...
	const offset = (firstDow + 6) % 7; // days back to Monday
	const start = new Date(first);
	start.setUTCDate(start.getUTCDate() - offset);
	const dates: string[] = [];
	for (let i = 0; i < 42; i++) {
		dates.push(start.toISOString().split('T')[0]);
		start.setUTCDate(start.getUTCDate() + 1);
	}
	return dates;
}

export function prevMonth(month: string): string {
	const [y, m] = month.split('-').map(Number);
	const d = new Date(Date.UTC(y, m - 2, 1));
	return d.toISOString().slice(0, 7);
}

export function nextMonth(month: string): string {
	const [y, m] = month.split('-').map(Number);
	const d = new Date(Date.UTC(y, m, 1));
	return d.toISOString().slice(0, 7);
}
