import { json } from '@sveltejs/kit';
import { desc, eq, count, gt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityLog, members } from '$lib/server/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
	const offset = parseInt(url.searchParams.get('offset') ?? '0');
	const since = url.searchParams.get('since');

	// If 'since' param, return just the count of new entries
	if (since) {
		const result = await db
			.select({ count: count() })
			.from(activityLog)
			.where(gt(activityLog.createdAt, since));
		return json({ newCount: result[0]?.count ?? 0 });
	}

	// Total count
	const totalResult = await db.select({ count: count() }).from(activityLog);
	const total = totalResult[0]?.count ?? 0;

	// Entries with actor name
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
		.limit(limit)
		.offset(offset);

	return json({ entries, total });
};
