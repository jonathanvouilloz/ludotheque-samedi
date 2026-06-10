import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { themes, themePeriods } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const result = await db.select().from(themes).where(eq(themes.id, params.id)).limit(1);
	if (!result[0]) error(404, { message: 'Thème introuvable' });
	return json(result[0]);
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await requireResponsable(request);

	const existing = await db.select().from(themes).where(eq(themes.id, params.id)).limit(1);
	if (!existing[0]) error(404, { message: 'Thème introuvable' });

	const body = await request.json();
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	if (!name) error(400, { message: 'Le nom du thème est obligatoire' });

	await db.update(themes).set({ name }).where(eq(themes.id, params.id));

	await logActivity(
		'theme_renamed',
		`${actor.name} a renommé le thème "${existing[0].name}" en "${name}"`,
		actor.id,
		{ themeId: params.id, oldName: existing[0].name, newName: name }
	);

	return json({ id: params.id, name });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const actor = await requireResponsable(request);

	const existing = await db.select().from(themes).where(eq(themes.id, params.id)).limit(1);
	if (!existing[0]) error(404, { message: 'Thème introuvable' });

	const periods = await db
		.select()
		.from(themePeriods)
		.where(eq(themePeriods.themeId, params.id))
		.limit(1);

	if (periods[0]) error(409, { message: 'Ce thème a des périodes, il ne peut pas être supprimé' });

	await db.delete(themes).where(eq(themes.id, params.id));

	await logActivity(
		'theme_deleted',
		`${actor.name} a supprimé le thème "${existing[0].name}"`,
		actor.id,
		{ themeId: params.id, themeName: existing[0].name }
	);

	return json({ success: true });
};
