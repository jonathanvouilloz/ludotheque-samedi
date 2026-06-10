import { json, error } from '@sveltejs/kit';
import { eq, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { themes, themePeriods } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const body = await request.json();
	const themeId = typeof body.themeId === 'string' ? body.themeId.trim() : '';
	if (!themeId) error(400, { message: 'themeId obligatoire' });

	const theme = await db.select().from(themes).where(eq(themes.id, themeId)).limit(1);
	if (!theme[0]) error(404, { message: 'Thème introuvable' });

	// Clôturer la période active si elle existe
	const activePeriods = await db
		.select()
		.from(themePeriods)
		.where(isNull(themePeriods.closedAt));

	if (activePeriods[0]) {
		await db
			.update(themePeriods)
			.set({ closedAt: new Date().toISOString() })
			.where(eq(themePeriods.id, activePeriods[0].id));
	}

	const id = ulid();
	await db.insert(themePeriods).values({
		id,
		themeId,
		startedBy: actor.id
	});

	await logActivity(
		'theme_changed',
		`${actor.name} a installé le thème "${theme[0].name}"`,
		actor.id,
		{ themeId, themeName: theme[0].name, periodId: id }
	);

	return json({ id, themeId, startedBy: actor.id }, { status: 201 });
};
