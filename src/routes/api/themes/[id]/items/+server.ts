import { json, error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { themes, themeItems } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const theme = await db.select().from(themes).where(eq(themes.id, params.id)).limit(1);
	if (!theme[0]) error(404, { message: 'Thème introuvable' });

	const items = await db
		.select()
		.from(themeItems)
		.where(eq(themeItems.themeId, params.id))
		.orderBy(asc(themeItems.createdAt));

	return json(items);
};

export const POST: RequestHandler = async ({ params, request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const theme = await db.select().from(themes).where(eq(themes.id, params.id)).limit(1);
	if (!theme[0]) error(404, { message: 'Thème introuvable' });

	const body = await request.json();
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const quantity =
		typeof body.quantity === 'number' && body.quantity >= 1 ? Math.floor(body.quantity) : 1;

	if (!name) error(400, { message: 'Le nom de l\'objet est obligatoire' });

	const id = ulid();
	await db.insert(themeItems).values({ id, themeId: params.id, name, quantity });

	await logActivity(
		'theme_item_added',
		`${actor.name} a ajouté "${name}" au thème "${theme[0].name}"`,
		actor.id,
		{ themeId: params.id, itemId: id, itemName: name }
	);

	return json({ id, themeId: params.id, name, quantity, isArchived: false }, { status: 201 });
};
