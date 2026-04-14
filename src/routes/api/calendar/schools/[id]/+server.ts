import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { schools } from '$lib/server/schema';
import { requireMember } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await requireMember(request);
	const existing = await db
		.select()
		.from(schools)
		.where(eq(schools.id, params.id))
		.limit(1);
	if (!existing[0]) error(404, { message: 'École introuvable' });

	const body = await request.json();
	const { name, address, contactName, contactEmail, phone, notes } = body as {
		name?: string;
		address?: string | null;
		contactName?: string | null;
		contactEmail?: string | null;
		phone?: string | null;
		notes?: string | null;
	};

	if (!name || !name.trim()) error(400, { message: 'Nom requis' });

	await db
		.update(schools)
		.set({
			name: name.trim(),
			address: address || null,
			contactName: contactName || null,
			contactEmail: contactEmail || null,
			phone: phone || null,
			notes: notes || null
		})
		.where(eq(schools.id, params.id));

	await logActivity(
		'school_updated',
		`${actor.name} a modifié l'école "${name.trim()}"`,
		actor.id,
		{ schoolId: params.id }
	);

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const actor = await requireMember(request);
	const existing = await db
		.select()
		.from(schools)
		.where(eq(schools.id, params.id))
		.limit(1);
	if (!existing[0]) error(404, { message: 'École introuvable' });

	await db.delete(schools).where(eq(schools.id, params.id));

	await logActivity(
		'school_deleted',
		`${actor.name} a supprimé l'école "${existing[0].name}"`,
		actor.id,
		{ schoolId: params.id }
	);

	return json({ success: true });
};
