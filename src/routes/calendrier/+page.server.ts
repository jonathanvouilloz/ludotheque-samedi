import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	events,
	eventAssignments,
	absences,
	schoolPeriods,
	saturdaySlots,
	schools,
	members
} from '$lib/server/schema';
import { addDays, today } from '$lib/utils/dates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const monthParam = url.searchParams.get('month') ?? today().slice(0, 7);
	// Window: from 10 days before the 1st (to show trailing days of prev month)
	// until ~45 days after (covers the full 6-week grid comfortably)
	const firstOfMonth = monthParam + '-01';
	const windowStart = addDays(firstOfMonth, -10);
	const windowEnd = addDays(firstOfMonth, 45);

	const [allEvents, allAssigns, allAbs, allPeriods, allSats, allSchools, allMembers] =
		await Promise.all([
			db
				.select()
				.from(events)
				.where(and(gte(events.date, windowStart), lte(events.date, windowEnd)))
				.orderBy(asc(events.date), asc(events.startTime)),
			db.select().from(eventAssignments),
			db.select().from(absences),
			db.select().from(schoolPeriods),
			db
				.select()
				.from(saturdaySlots)
				.where(and(gte(saturdaySlots.date, windowStart), lte(saturdaySlots.date, windowEnd))),
			db.select().from(schools).orderBy(asc(schools.name)),
			db
				.select({ id: members.id, name: members.name })
				.from(members)
				.where(eq(members.isActive, true))
				.orderBy(asc(members.name))
		]);

	return {
		month: monthParam,
		events: allEvents,
		assignments: allAssigns,
		absences: allAbs,
		periods: allPeriods,
		saturdays: allSats,
		schools: allSchools,
		members: allMembers
	};
};
