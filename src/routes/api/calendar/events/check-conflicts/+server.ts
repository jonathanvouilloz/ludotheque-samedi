import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	events,
	eventAssignments,
	absences,
	schoolPeriods,
	saturdaySlots,
	members
} from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { checkEventConflicts } from '$lib/utils/conflicts';
import { addDays } from '$lib/utils/dates';
import type { EventKind } from '$lib/server/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const body = await request.json();
	const { date, startTime, endTime, memberIds, location, kind, excludeEventId, weeks } =
		body as {
			date?: string;
			startTime?: string;
			endTime?: string;
			memberIds?: string[];
			location?: string | null;
			kind?: string;
			excludeEventId?: string;
			weeks?: number;
		};

	if (!date || !startTime || !endTime || !kind) {
		error(400, { message: 'Paramètres manquants' });
	}

	const [allEvents, allAssigns, allAbs, allPeriods, allSats, allMembers] = await Promise.all([
		db.select().from(events),
		db.select().from(eventAssignments),
		db.select().from(absences),
		db.select().from(schoolPeriods),
		db.select().from(saturdaySlots),
		db.select({ id: members.id, name: members.name }).from(members)
	]);

	const memberNames = new Map(allMembers.map((m) => [m.id, m.name]));

	const occurrences = weeks && weeks > 1 ? weeks : 1;
	const results: { date: string; conflicts: ReturnType<typeof checkEventConflicts> }[] = [];

	for (let i = 0; i < occurrences; i++) {
		const occurrenceDate = i === 0 ? date : addDays(date, i * 7);
		const conflicts = checkEventConflicts(
			{
				date: occurrenceDate,
				startTime,
				endTime,
				memberIds: memberIds ?? [],
				location: location ?? null,
				kind: kind as EventKind,
				excludeEventId
			},
			{
				events: allEvents,
				assignments: allAssigns,
				absences: allAbs,
				schoolPeriods: allPeriods,
				saturdaySlots: allSats,
				memberNames
			}
		);
		results.push({ date: occurrenceDate, conflicts });
	}

	return json({ results });
};
