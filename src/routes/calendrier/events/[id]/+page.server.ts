import { error as svelteError } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { events, eventAssignments, schools, members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const row = await db.select().from(events).where(eq(events.id, params.id)).limit(1);
	if (!row[0]) svelteError(404, { message: 'Événement introuvable' });

	const assigns = await db
		.select({ memberId: eventAssignments.memberId })
		.from(eventAssignments)
		.where(eq(eventAssignments.eventId, params.id));

	const [allSchools, allMembers] = await Promise.all([
		db.select().from(schools).orderBy(asc(schools.name)),
		db
			.select({ id: members.id, name: members.name })
			.from(members)
			.where(eq(members.isActive, true))
			.orderBy(asc(members.name))
	]);

	return {
		event: row[0],
		memberIds: assigns.map((a) => a.memberId),
		schools: allSchools,
		members: allMembers
	};
};
