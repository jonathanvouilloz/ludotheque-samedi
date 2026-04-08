import { dateRangeOverlap, timeRangeOverlap } from './dates';
import type {
	Event,
	EventAssignment,
	Absence,
	SchoolPeriod,
	SaturdaySlot,
	EventKind
} from '$lib/server/schema';

export type ConflictSeverity = 'blocking' | 'warning';

export type Conflict =
	| {
			type: 'member_double_booked';
			severity: ConflictSeverity;
			memberId: string;
			eventId: string;
			message: string;
	  }
	| {
			type: 'member_on_absence';
			severity: ConflictSeverity;
			memberId: string;
			absenceId: string;
			message: string;
	  }
	| {
			type: 'school_vacation';
			severity: ConflictSeverity;
			periodId: string;
			message: string;
	  }
	| {
			type: 'holiday';
			severity: ConflictSeverity;
			periodId: string;
			message: string;
	  }
	| {
			type: 'saturday_overlap';
			severity: ConflictSeverity;
			slotId: string;
			message: string;
	  }
	| {
			type: 'location_conflict';
			severity: ConflictSeverity;
			eventId: string;
			message: string;
	  };

export interface ConflictCheckInput {
	date: string;
	startTime: string;
	endTime: string;
	memberIds: string[];
	location?: string | null;
	kind: EventKind;
	excludeEventId?: string;
}

export interface ConflictCheckContext {
	events: Event[];
	assignments: EventAssignment[];
	absences: Absence[];
	schoolPeriods: SchoolPeriod[];
	saturdaySlots: SaturdaySlot[];
	memberNames?: Map<string, string>;
}

export function checkEventConflicts(
	input: ConflictCheckInput,
	ctx: ConflictCheckContext
): Conflict[] {
	const conflicts: Conflict[] = [];
	const memberName = (id: string) => ctx.memberNames?.get(id) ?? id;

	const otherEvents = ctx.events.filter(
		(e) => e.id !== input.excludeEventId && e.date === input.date
	);
	const overlappingEvents = otherEvents.filter((e) =>
		timeRangeOverlap(input.startTime, input.endTime, e.startTime, e.endTime)
	);

	// Member double booked
	for (const memberId of input.memberIds) {
		for (const ev of overlappingEvents) {
			const assigned = ctx.assignments.some(
				(a) => a.eventId === ev.id && a.memberId === memberId
			);
			if (assigned) {
				conflicts.push({
					type: 'member_double_booked',
					severity: 'blocking',
					memberId,
					eventId: ev.id,
					message: `${memberName(memberId)} est déjà assigné·e à "${ev.title}" (${ev.startTime}–${ev.endTime})`
				});
			}
		}
	}

	// Member on absence
	for (const memberId of input.memberIds) {
		const relevant = ctx.absences.filter(
			(a) =>
				a.memberId === memberId &&
				a.status !== 'rejected' &&
				dateRangeOverlap(input.date, input.date, a.startDate, a.endDate)
		);
		for (const abs of relevant) {
			// If time-bounded absence on same day, check time overlap
			if (abs.startTime && abs.endTime && abs.startDate === abs.endDate) {
				if (!timeRangeOverlap(input.startTime, input.endTime, abs.startTime, abs.endTime)) {
					continue;
				}
			}
			const pending = abs.status === 'pending';
			conflicts.push({
				type: 'member_on_absence',
				severity: pending ? 'warning' : 'blocking',
				memberId,
				absenceId: abs.id,
				message: `${memberName(memberId)} a ${pending ? 'demandé' : ''} une absence (${abs.type}) qui couvre cette date${pending ? ' — en attente d\'approbation' : ''}`
			});
		}
	}

	// School periods
	for (const period of ctx.schoolPeriods) {
		if (!dateRangeOverlap(input.date, input.date, period.startDate, period.endDate)) continue;
		if (period.type === 'vacation') {
			conflicts.push({
				type: 'school_vacation',
				severity: period.isBlocking && input.kind === 'accueil' ? 'blocking' : 'warning',
				periodId: period.id,
				message: `${period.label} (vacances scolaires)`
			});
		} else if (period.type === 'holiday') {
			conflicts.push({
				type: 'holiday',
				severity: period.isBlocking ? 'blocking' : 'warning',
				periodId: period.id,
				message: `${period.label} (jour férié)`
			});
		} else {
			conflicts.push({
				type: 'holiday',
				severity: 'warning',
				periodId: period.id,
				message: `${period.label} (${period.type})`
			});
		}
	}

	// Saturday overlap
	const sat = ctx.saturdaySlots.find((s) => s.date === input.date && !s.isClosed);
	if (sat) {
		conflicts.push({
			type: 'saturday_overlap',
			severity: 'warning',
			slotId: sat.id,
			message: `Samedi ludothèque ouvert ce jour-là`
		});
	}

	// Location conflict
	if (input.location?.trim()) {
		const loc = input.location.trim().toLowerCase();
		for (const ev of overlappingEvents) {
			if (ev.location?.trim().toLowerCase() === loc) {
				conflicts.push({
					type: 'location_conflict',
					severity: 'warning',
					eventId: ev.id,
					message: `Lieu déjà occupé par "${ev.title}" (${ev.startTime}–${ev.endTime})`
				});
			}
		}
	}

	return conflicts;
}
