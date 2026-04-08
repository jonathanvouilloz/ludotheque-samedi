import { asc, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { absences, members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: absences.id,
			memberId: absences.memberId,
			memberName: members.name,
			type: absences.type,
			startDate: absences.startDate,
			endDate: absences.endDate,
			startTime: absences.startTime,
			endTime: absences.endTime,
			status: absences.status,
			requestNote: absences.requestNote,
			responseNote: absences.responseNote,
			requestedBy: absences.requestedBy,
			respondedBy: absences.respondedBy,
			respondedAt: absences.respondedAt,
			createdAt: absences.createdAt
		})
		.from(absences)
		.leftJoin(members, eq(absences.memberId, members.id))
		.orderBy(desc(absences.startDate));

	const allMembers = await db
		.select({ id: members.id, name: members.name, label: members.label })
		.from(members)
		.where(eq(members.isActive, true))
		.orderBy(asc(members.name));

	return { absences: rows, members: allMembers };
};
