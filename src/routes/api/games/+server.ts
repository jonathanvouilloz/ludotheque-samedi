import { json, error } from '@sveltejs/kit';
import { desc, asc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { gameWishes } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await db
		.select()
		.from(gameWishes)
		.orderBy(asc(gameWishes.isPurchased), desc(gameWishes.createdAt));

	return json(result);
};

export const POST: RequestHandler = async ({ request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const body = await request.json();
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const link = typeof body.link === 'string' && body.link.trim() ? body.link.trim() : null;
	const price = typeof body.price === 'number' && body.price > 0 ? body.price : null;

	if (!name) error(400, { message: 'Le nom du jeu est obligatoire' });

	const id = ulid();
	await db.insert(gameWishes).values({
		id,
		name,
		link,
		price,
		addedBy: actor.id
	});

	await logActivity('game_added', `${actor.name} a ajouté "${name}"`, actor.id, {
		gameId: id,
		gameName: name
	});

	return json({ id, name, link, price, addedBy: actor.id }, { status: 201 });
};
