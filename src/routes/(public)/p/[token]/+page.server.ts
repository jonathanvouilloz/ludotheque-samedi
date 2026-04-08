import { error as svelteError } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
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
			message: proposals.message
		})
		.from(proposals)
		.leftJoin(schools, eq(proposals.schoolId, schools.id))
		.where(eq(proposals.token, params.token))
		.limit(1);

	if (!row[0]) svelteError(404, { message: 'Proposition introuvable' });

	let proposal = row[0];
	if (proposal.status === 'sent' && proposal.deadline < today()) {
		await db.update(proposals).set({ status: 'expired' }).where(eq(proposals.id, proposal.id));
		proposal = { ...proposal, status: 'expired' };
	}

	if (proposal.status === 'draft') {
		svelteError(404, { message: 'Proposition non disponible' });
	}

	const eventRows = await db
		.select()
		.from(events)
		.where(eq(events.proposalId, proposal.id))
		.orderBy(asc(events.date), asc(events.startTime));

	const assigns = await db
		.select({
			eventId: eventAssignments.eventId,
			memberName: members.name
		})
		.from(eventAssignments)
		.leftJoin(members, eq(eventAssignments.memberId, members.id));

	const byEvent = new Map<string, string[]>();
	for (const a of assigns) {
		if (!a.memberName) continue;
		if (!byEvent.has(a.eventId)) byEvent.set(a.eventId, []);
		byEvent.get(a.eventId)!.push(a.memberName);
	}

	return {
		proposal,
		events: eventRows.map((e) => ({
			id: e.id,
			date: e.date,
			startTime: e.startTime,
			endTime: e.endTime,
			location: e.location,
			classLabel: e.classLabel,
			contactName: e.contactName,
			contactEmail: e.contactEmail,
			ageRange: e.ageRange,
			childCount: e.childCount,
			notes: e.notes,
			declined: e.declined,
			memberNames: byEvent.get(e.id) ?? []
		}))
	};
};
