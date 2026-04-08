import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	members,
	events,
	eventAssignments,
	absences,
	schoolPeriods,
	saturdaySlots
} from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [allMembers, allEvents, allAssigns, allAbs, allPeriods, allSats] = await Promise.all([
		db
			.select({ id: members.id, name: members.name })
			.from(members)
			.where(eq(members.isActive, true))
			.orderBy(asc(members.name)),
		db.select().from(events),
		db.select().from(eventAssignments),
		db.select().from(absences),
		db.select().from(schoolPeriods),
		db.select().from(saturdaySlots)
	]);
	return {
		members: allMembers,
		events: allEvents,
		assignments: allAssigns,
		absences: allAbs,
		periods: allPeriods,
		saturdays: allSats
	};
};
