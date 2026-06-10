import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { themes, themeItems } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const item = await db
		.select()
		.from(themeItems)
		.where(eq(themeItems.id, params.itemId))
		.limit(1);
	if (!item[0] || item[0].themeId !== params.id) error(404, { message: 'Objet introuvable' });

	const body = await request.json();
	const updates: Record<string, unknown> = {};

	if (typeof body.name === 'string' && body.name.trim()) {
		updates.name = body.name.trim();
	}
	if (typeof body.quantity === 'number' && body.quantity >= 1) {
		updates.quantity = Math.floor(body.quantity);
	}

	if (Object.keys(updates).length === 0) error(400, { message: 'Aucune modification fournie' });

	await db.update(themeItems).set(updates).where(eq(themeItems.id, params.itemId));

	const theme = await db.select().from(themes).where(eq(themes.id, params.id)).limit(1);

	await logActivity(
		'theme_item_updated',
		`${actor.name} a modifié "${item[0].name}" dans le thème "${theme[0]?.name ?? ''}"`,
		actor.id,
		{ themeId: params.id, itemId: params.itemId }
	);

	return json({ ...item[0], ...updates });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const item = await db
		.select()
		.from(themeItems)
		.where(eq(themeItems.id, params.itemId))
		.limit(1);
	if (!item[0] || item[0].themeId !== params.id) error(404, { message: 'Objet introuvable' });

	await db
		.update(themeItems)
		.set({ isArchived: true })
		.where(eq(themeItems.id, params.itemId));

	const theme = await db.select().from(themes).where(eq(themes.id, params.id)).limit(1);

	await logActivity(
		'theme_item_archived',
		`${actor.name} a retiré "${item[0].name}" du thème "${theme[0]?.name ?? ''}"`,
		actor.id,
		{ themeId: params.id, itemId: params.itemId, itemName: item[0].name }
	);

	return json({ success: true });
};
