import { desc, eq, count } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityLog, members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const totalResult = await db.select({ count: count() }).from(activityLog);
	const total = totalResult[0]?.count ?? 0;

	const entries = await db
		.select({
			id: activityLog.id,
			type: activityLog.type,
			description: activityLog.description,
			actorName: members.name,
			createdAt: activityLog.createdAt
		})
		.from(activityLog)
		.leftJoin(members, eq(activityLog.actorId, members.id))
		.orderBy(desc(activityLog.createdAt))
		.limit(50);

	return { entries, total };
};
