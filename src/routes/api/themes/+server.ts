import { json, error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { themes, themeItems } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await db.select().from(themes).orderBy(asc(themes.name));
	return json(result);
};

export const POST: RequestHandler = async ({ request }) => {
	const actor = await requireResponsable(request);

	const body = await request.json();
	const name = typeof body.name === 'string' ? body.name.trim() : '';

	if (!name) error(400, { message: 'Le nom du thème est obligatoire' });

	const existing = await db.select().from(themes).where(eq(themes.name, name)).limit(1);
	if (existing[0]) error(409, { message: 'Un thème avec ce nom existe déjà' });

	const id = ulid();
	await db.insert(themes).values({ id, name });

	await logActivity('theme_created', `${actor.name} a créé le thème "${name}"`, actor.id, {
		themeId: id,
		themeName: name
	});

	return json({ id, name }, { status: 201 });
};
