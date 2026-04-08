import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { proposals, schools } from '$lib/server/schema';
import { logActivity } from '$lib/server/activity';
import { today } from '$lib/utils/dates';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params }) => {
	const row = await db
		.select({
			id: proposals.id,
			title: proposals.title,
			schoolId: proposals.schoolId,
			status: proposals.status,
			deadline: proposals.deadline,
			createdBy: proposals.createdBy
		})
		.from(proposals)
		.where(eq(proposals.token, params.token))
		.limit(1);
	if (!row[0]) error(404, { message: 'Proposition introuvable' });

	if (row[0].status !== 'sent' && row[0].status !== 'submitted') {
		error(403, { message: 'Non modifiable' });
	}
	if (row[0].deadline < today()) {
		error(403, { message: 'Deadline dépassée' });
	}

	await db
		.update(proposals)
		.set({ status: 'submitted', submittedAt: new Date().toISOString() })
		.where(eq(proposals.id, row[0].id));

	// Get school name for log
	const schoolRow = await db
		.select({ name: schools.name })
		.from(schools)
		.where(eq(schools.id, row[0].schoolId))
		.limit(1);
	const schoolName = schoolRow[0]?.name ?? '?';

	await logActivity(
		'proposal_submitted',
		`${schoolName} a soumis ses réponses pour "${row[0].title}"`,
		row[0].createdBy,
		{ proposalId: row[0].id, schoolId: row[0].schoolId }
	);

	return json({ success: true });
};
