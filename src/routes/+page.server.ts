import { desc, eq, and, lte, gte, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { seasons, saturdaySlots, assignments, members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const todayStr = new Date().toISOString().split('T')[0];

	// Try current season (today between start and end)
	let seasonResult = await db
		.select()
		.from(seasons)
		.where(and(lte(seasons.startDate, todayStr), gte(seasons.endDate, todayStr)))
		.limit(1);

	// Fallback: most recent season
	if (!seasonResult[0]) {
		seasonResult = await db
			.select()
			.from(seasons)
			.orderBy(desc(seasons.startDate))
			.limit(1);
	}

	// All seasons for dropdown
	const allSeasons = await db
		.select({ id: seasons.id, name: seasons.name })
		.from(seasons)
		.orderBy(desc(seasons.startDate));

	if (!seasonResult[0]) {
		return { season: null, slots: [], allSeasons };
	}

	const season = seasonResult[0];

	// Fetch slots
	const slots = await db
		.select()
		.from(saturdaySlots)
		.where(eq(saturdaySlots.seasonId, season.id))
		.orderBy(saturdaySlots.date);

	if (slots.length === 0) {
		return { season, slots: [], allSeasons };
	}

	// Fetch assignments with members
	const slotIds = slots.map((s) => s.id);
	const assignmentRows = await db
		.select({
			id: assignments.id,
			slotId: assignments.slotId,
			memberId: assignments.memberId,
			memberName: members.name,
			memberIsPermanent: members.isPermanent
		})
		.from(assignments)
		.innerJoin(members, eq(assignments.memberId, members.id))
		.where(inArray(assignments.slotId, slotIds));

	// Group by slot
	const assignmentsBySlot = new Map<
		string,
		Array<{ id: string; member: { id: string; name: string; isPermanent: boolean } }>
	>();
	for (const row of assignmentRows) {
		if (!assignmentsBySlot.has(row.slotId)) {
			assignmentsBySlot.set(row.slotId, []);
		}
		assignmentsBySlot.get(row.slotId)!.push({
			id: row.id,
			member: { id: row.memberId, name: row.memberName, isPermanent: row.memberIsPermanent }
		});
	}

	const slotsWithAssignments = slots.map((slot) => ({
		id: slot.id,
		date: slot.date,
		type: slot.type,
		eventLabel: slot.eventLabel,
		requiredCount: slot.requiredCount,
		isClosed: slot.isClosed,
		assignments: assignmentsBySlot.get(slot.id) ?? []
	}));

	return { season, slots: slotsWithAssignments, allSeasons };
};
