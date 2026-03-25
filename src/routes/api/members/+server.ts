import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { members } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await db
		.select()
		.from(members)
		.where(eq(members.isActive, true))
		.orderBy(members.name);

	return json(result);
};

export const POST: RequestHandler = async ({ request }) => {
	const actor = await requireResponsable(request);

	const body = await request.json();
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const label = typeof body.label === 'string' ? body.label.trim() || null : null;
	const isPermanent = body.isPermanent === true;

	if (!name) {
		error(400, { message: 'Le nom est obligatoire' });
	}

	// Check uniqueness
	const existing = await db
		.select()
		.from(members)
		.where(eq(members.name, name))
		.limit(1);

	if (existing.length > 0) {
		error(409, { message: 'Un membre avec ce nom existe déjà' });
	}

	const id = ulid();
	const newMember = {
		id,
		name,
		label,
		isPermanent,
		isActive: true
	};

	await db.insert(members).values(newMember);

	await logActivity(
		'member_added',
		`${actor.name} a ajouté ${name}`,
		actor.id,
		{ memberId: id, memberName: name }
	);

	return json(newMember, { status: 201 });
};
