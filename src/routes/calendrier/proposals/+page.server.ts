import { desc, eq, lt, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { proposals, schools } from '$lib/server/schema';
import { today } from '$lib/utils/dates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Auto-expire stale proposals
	await db
		.update(proposals)
		.set({ status: 'expired' })
		.where(and(eq(proposals.status, 'sent'), lt(proposals.deadline, today())));

	const rows = await db
		.select({
			id: proposals.id,
			title: proposals.title,
			schoolId: proposals.schoolId,
			schoolName: schools.name,
			status: proposals.status,
			deadline: proposals.deadline,
			createdAt: proposals.createdAt,
			submittedAt: proposals.submittedAt
		})
		.from(proposals)
		.leftJoin(schools, eq(proposals.schoolId, schools.id))
		.orderBy(desc(proposals.createdAt));

	return { proposals: rows };
};
