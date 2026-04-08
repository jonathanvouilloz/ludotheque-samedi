import { json, error } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { schools } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const rows = await db.select().from(schools).orderBy(asc(schools.name));
	return json(rows);
};

export const POST: RequestHandler = async ({ request }) => {
	const actor = await requireResponsable(request);
	const body = await request.json();
	const { name, address, contactName, contactEmail, phone, notes } = body as {
		name?: string;
		address?: string | null;
		contactName?: string | null;
		contactEmail?: string | null;
		phone?: string | null;
		notes?: string | null;
	};

	if (!name || !name.trim()) {
		error(400, { message: 'Nom requis' });
	}

	const id = ulid();
	await db.insert(schools).values({
		id,
		name: name.trim(),
		address: address || null,
		contactName: contactName || null,
		contactEmail: contactEmail || null,
		phone: phone || null,
		notes: notes || null
	});

	await logActivity(
		'school_created',
		`${actor.name} a ajouté l'école "${name.trim()}"`,
		actor.id,
		{ schoolId: id }
	);

	return json({ success: true, id });
};
