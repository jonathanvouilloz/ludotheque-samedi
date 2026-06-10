import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { checkups, checkupEntries } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';
import type { ResolutionType } from '$lib/server/schema';

const VALID_RESOLUTION_TYPES: ResolutionType[] = ['repaired', 'replaced', 'found'];

export const PATCH: RequestHandler = async ({ params, request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const checkup = await db
		.select()
		.from(checkups)
		.where(eq(checkups.id, params.checkupId))
		.limit(1);
	if (!checkup[0]) error(404, { message: 'Check-up introuvable' });

	const entry = await db
		.select()
		.from(checkupEntries)
		.where(eq(checkupEntries.id, params.entryId))
		.limit(1);

	if (!entry[0] || entry[0].checkupId !== params.checkupId) {
		error(404, { message: 'Entrée introuvable' });
	}

	if (entry[0].resolvedAt) {
		error(409, { message: 'Ce problème est déjà résolu' });
	}

	const body = await request.json();
	const resolutionType = body.resolutionType as string;
	if (!VALID_RESOLUTION_TYPES.includes(resolutionType as ResolutionType)) {
		error(400, { message: 'resolutionType invalide' });
	}

	const note = typeof body.note === 'string' ? body.note.trim() || null : entry[0].note;
	const resolvedAt = new Date().toISOString();

	await db
		.update(checkupEntries)
		.set({ resolvedAt, resolvedBy: actor.id, resolutionType, note })
		.where(eq(checkupEntries.id, params.entryId));

	await logActivity(
		'checkup_problem_resolved',
		`${actor.name} a résolu un problème (${resolutionType})`,
		actor.id,
		{ checkupId: params.checkupId, entryId: params.entryId, resolutionType }
	);

	return json({ ...entry[0], resolvedAt, resolvedBy: actor.id, resolutionType, note });
};
