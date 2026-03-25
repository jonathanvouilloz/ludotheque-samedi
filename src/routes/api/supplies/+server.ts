import { json, error } from '@sveltejs/kit';
import { desc, asc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { supplyNeeds } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await db
		.select()
		.from(supplyNeeds)
		.orderBy(asc(supplyNeeds.isPurchased), desc(supplyNeeds.urgency), desc(supplyNeeds.createdAt));

	return json(result);
};

export const POST: RequestHandler = async ({ request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const body = await request.json();
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const link = typeof body.link === 'string' && body.link.trim() ? body.link.trim() : null;
	const price = typeof body.price === 'number' && body.price > 0 ? body.price : null;
	const category = typeof body.category === 'string' ? body.category : 'autre';
	const urgency = body.urgency === 'urgent' ? 'urgent' : 'normal';

	if (!name) error(400, { message: 'Le nom de l\'article est obligatoire' });

	const validCategories = ['ménage', 'bureau', 'animation', 'autre'];
	if (!validCategories.includes(category)) error(400, { message: 'Catégorie invalide' });

	const id = ulid();
	await db.insert(supplyNeeds).values({
		id,
		name,
		link,
		price,
		category,
		urgency,
		addedBy: actor.id
	});

	await logActivity('supply_added', `${actor.name} a ajouté "${name}"`, actor.id, {
		supplyId: id,
		supplyName: name,
		category,
		urgency
	});

	return json({ id, name, link, price, category, urgency, addedBy: actor.id }, { status: 201 });
};
