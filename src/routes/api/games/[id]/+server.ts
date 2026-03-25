import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { gameWishes } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const existing = await db
		.select()
		.from(gameWishes)
		.where(eq(gameWishes.id, params.id))
		.limit(1);

	if (!existing[0]) error(404, { message: 'Jeu introuvable' });

	const body = await request.json();
	const isPurchased = body.isPurchased === true;

	await db
		.update(gameWishes)
		.set({
			isPurchased,
			purchasedBy: isPurchased ? actor.id : null,
			purchasedAt: isPurchased ? new Date().toISOString() : null
		})
		.where(eq(gameWishes.id, params.id));

	const game = existing[0];
	await logActivity(
		isPurchased ? 'game_purchased' : 'game_unpurchased',
		isPurchased
			? `${actor.name} a marqué "${game.name}" comme acheté`
			: `${actor.name} a remis "${game.name}" à acheter`,
		actor.id,
		{ gameId: params.id, gameName: game.name }
	);

	return json({ success: true });
};
