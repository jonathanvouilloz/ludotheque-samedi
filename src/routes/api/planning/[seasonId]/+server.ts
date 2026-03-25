import { json, error } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { seasons, saturdaySlots, assignments, members } from '$lib/server/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	// Fetch season
	const seasonResult = await db
		.select()
		.from(seasons)
		.where(eq(seasons.id, params.seasonId))
		.limit(1);

	if (!seasonResult[0]) {
		error(404, { message: 'Saison introuvable' });
	}

	// Fetch slots ordered by date
	const slots = await db
		.select()
		.from(saturdaySlots)
		.where(eq(saturdaySlots.seasonId, params.seasonId))
		.orderBy(saturdaySlots.date);

	if (slots.length === 0) {
		return json({ season: seasonResult[0], slots: [] });
	}

	// Fetch all assignments with member info
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

	// Group assignments by slotId
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
			member: {
				id: row.memberId,
				name: row.memberName,
				isPermanent: row.memberIsPermanent
			}
		});
	}

	// Build response
	const slotsWithAssignments = slots.map((slot) => ({
		id: slot.id,
		date: slot.date,
		type: slot.type,
		eventLabel: slot.eventLabel,
		requiredCount: slot.requiredCount,
		isClosed: slot.isClosed,
		assignments: assignmentsBySlot.get(slot.id) ?? []
	}));

	return json({ season: seasonResult[0], slots: slotsWithAssignments });
};
