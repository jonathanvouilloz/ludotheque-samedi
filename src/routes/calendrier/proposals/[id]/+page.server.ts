import { error as svelteError } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	proposals,
	events,
	eventAssignments,
	schools,
	members
} from '$lib/server/schema';
import { today } from '$lib/utils/dates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const row = await db
		.select({
			id: proposals.id,
			title: proposals.title,
			schoolId: proposals.schoolId,
			schoolName: schools.name,
			token: proposals.token,
			status: proposals.status,
			deadline: proposals.deadline,
			message: proposals.message,
			createdAt: proposals.createdAt,
			submittedAt: proposals.submittedAt,
			confirmedAt: proposals.confirmedAt
		})
		.from(proposals)
		.leftJoin(schools, eq(proposals.schoolId, schools.id))
		.where(eq(proposals.id, params.id))
		.limit(1);

	if (!row[0]) svelteError(404, { message: 'Proposition introuvable' });

	// Auto-expire
	if (row[0].status === 'sent' && row[0].deadline < today()) {
		await db.update(proposals).set({ status: 'expired' }).where(eq(proposals.id, params.id));
		row[0].status = 'expired';
	}

	const eventRows = await db
		.select()
		.from(events)
		.where(eq(events.proposalId, params.id))
		.orderBy(asc(events.date), asc(events.startTime));

	const assigns = await db
		.select({
			eventId: eventAssignments.eventId,
			memberId: eventAssignments.memberId,
			memberName: members.name
		})
		.from(eventAssignments)
		.leftJoin(members, eq(eventAssignments.memberId, members.id));

	const byEvent = new Map<string, { memberId: string; memberName: string | null }[]>();
	for (const a of assigns) {
		if (!byEvent.has(a.eventId)) byEvent.set(a.eventId, []);
		byEvent.get(a.eventId)!.push({ memberId: a.memberId, memberName: a.memberName });
	}

	const eventsWithMembers = eventRows.map((e) => ({
		...e,
		members: byEvent.get(e.id) ?? []
	}));

	return { proposal: row[0], events: eventsWithMembers };
};
