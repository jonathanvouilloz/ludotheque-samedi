import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { checkups, checkupEntries } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import type { CheckupEntryStatus } from '$lib/server/schema';

const VALID_STATUSES: CheckupEntryStatus[] = ['present', 'broken', 'missing', 'needs_more', 'suggestion'];

export const POST: RequestHandler = async ({ params, request }) => {
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
	if (!Array.isArray(body.entries)) error(400, { message: 'entries doit être un tableau' });

	// Supprimer les entrées existantes avant de re-sauvegarder (upsert simplifié)
	await db.delete(checkupEntries).where(eq(checkupEntries.checkupId, params.checkupId));

	const toInsert = [];
	for (const entry of body.entries) {
		const status: string = entry.status;
		if (!VALID_STATUSES.includes(status as CheckupEntryStatus)) {
			error(400, { message: `Statut invalide: ${status}` });
		}

		if (status === 'suggestion') {
			const suggestedName = typeof entry.suggestedName === 'string' ? entry.suggestedName.trim() : '';
			if (!suggestedName) error(400, { message: 'suggestedName requis pour une suggestion' });
			toInsert.push({
				id: ulid(),
				checkupId: params.checkupId,
				themeItemId: null,
				status: status as CheckupEntryStatus,
				suggestedName,
				note: typeof entry.note === 'string' ? entry.note.trim() || null : null
			});
		} else {
			const themeItemId = typeof entry.themeItemId === 'string' ? entry.themeItemId : null;
			if (!themeItemId) error(400, { message: 'themeItemId requis pour une entrée non-suggestion' });
			toInsert.push({
				id: ulid(),
				checkupId: params.checkupId,
				themeItemId,
				status: status as CheckupEntryStatus,
				suggestedName: null,
				note: typeof entry.note === 'string' ? entry.note.trim() || null : null
			});
		}
	}

	if (toInsert.length > 0) {
		await db.insert(checkupEntries).values(toInsert);
	}

	return json({ saved: toInsert.length });
};
