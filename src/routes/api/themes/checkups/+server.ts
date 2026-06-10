import { json, error } from '@sveltejs/kit';
import { eq, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { themePeriods, checkups } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const activePeriods = await db
		.select()
		.from(themePeriods)
		.where(isNull(themePeriods.closedAt))
		.limit(1);

	if (!activePeriods[0]) error(400, { message: 'Aucun thème actif' });

	const id = ulid();
	await db.insert(checkups).values({
		id,
		themePeriodId: activePeriods[0].id,
		doneBy: actor.id
	});

	await logActivity(
		'checkup_started',
		`${actor.name} a démarré un check-up`,
		actor.id,
		{ checkupId: id, themePeriodId: activePeriods[0].id }
	);

	return json({ id, themePeriodId: activePeriods[0].id, doneBy: actor.id }, { status: 201 });
};
