import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { supplyNeeds } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const existing = await db
		.select()
		.from(supplyNeeds)
		.where(eq(supplyNeeds.id, params.id))
		.limit(1);

	if (!existing[0]) error(404, { message: 'Article introuvable' });

	const body = await request.json();
	const isPurchased = body.isPurchased === true;

	await db
		.update(supplyNeeds)
		.set({
			isPurchased,
			purchasedBy: isPurchased ? actor.id : null,
			purchasedAt: isPurchased ? new Date().toISOString() : null
		})
		.where(eq(supplyNeeds.id, params.id));

	const supply = existing[0];
	await logActivity(
		isPurchased ? 'supply_purchased' : 'supply_unpurchased',
		isPurchased
			? `${actor.name} a marqué "${supply.name}" comme acheté`
			: `${actor.name} a remis "${supply.name}" à acheter`,
		actor.id,
		{ supplyId: params.id, supplyName: supply.name }
	);

	return json({ success: true });
};
