import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { checkups, checkupEntries, themeItems } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const checkup = await db
		.select()
		.from(checkups)
		.where(eq(checkups.id, params.checkupId))
		.limit(1);

	if (!checkup[0]) error(404, { message: 'Check-up introuvable' });

	const entries = await db
		.select()
		.from(checkupEntries)
		.where(eq(checkupEntries.checkupId, params.checkupId));

	return json({ checkup: checkup[0], entries });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const checkup = await db
		.select()
		.from(checkups)
		.where(eq(checkups.id, params.checkupId))
		.limit(1);

	if (!checkup[0]) error(404, { message: 'Check-up introuvable' });
	if (checkup[0].completedAt) error(409, { message: 'Ce check-up est déjà validé' });

	const body = await request.json();
	const note = typeof body.note === 'string' ? body.note.trim() || null : null;

	const completedAt = new Date().toISOString();
	await db
		.update(checkups)
		.set({ completedAt, note })
		.where(eq(checkups.id, params.checkupId));

	await logActivity(
		'checkup_completed',
		`${actor.name} a validé un check-up`,
		actor.id,
		{ checkupId: params.checkupId }
	);

	return json({ ...checkup[0], completedAt, note });
};
