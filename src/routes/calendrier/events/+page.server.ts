import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { events, eventAssignments, schools, members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: events.id,
			title: events.title,
			kind: events.kind,
			schoolId: events.schoolId,
			schoolName: schools.name,
			date: events.date,
			startTime: events.startTime,
			endTime: events.endTime,
			location: events.location,
			status: events.status,
			recurrenceGroupId: events.recurrenceGroupId
		})
		.from(events)
		.leftJoin(schools, eq(events.schoolId, schools.id))
		.orderBy(asc(events.date), asc(events.startTime));

	const assigns = await db
		.select({
			eventId: eventAssignments.eventId,
			memberId: eventAssignments.memberId,
			memberName: members.name
		})
		.from(eventAssignments)
		.leftJoin(members, eq(eventAssignments.memberId, members.id));

	// Group assignments by eventId
	const byEvent = new Map<string, { memberId: string; memberName: string | null }[]>();
	for (const a of assigns) {
		if (!byEvent.has(a.eventId)) byEvent.set(a.eventId, []);
		byEvent.get(a.eventId)!.push({ memberId: a.memberId, memberName: a.memberName });
	}

	const eventsWithMembers = rows.map((e) => ({
		...e,
		members: byEvent.get(e.id) ?? []
	}));

	return { events: eventsWithMembers };
};
