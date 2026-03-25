import { json, error } from '@sveltejs/kit';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members, assignments, saturdaySlots } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await requireResponsable(request);

	const existing = await db
		.select()
		.from(members)
		.where(eq(members.id, params.id))
		.limit(1);

	if (existing.length === 0) {
		error(404, { message: 'Membre introuvable' });
	}

	const body = await request.json();
	const updates: Record<string, unknown> = {};

	if (typeof body.name === 'string' && body.name.trim()) {
		updates.name = body.name.trim();
	}
	if (typeof body.label === 'string') {
		updates.label = body.label.trim() || null;
	}
	if (typeof body.isPermanent === 'boolean') {
		updates.isPermanent = body.isPermanent;
	}

	if (Object.keys(updates).length === 0) {
		error(400, { message: 'Aucune modification fournie' });
	}

	await db.update(members).set(updates).where(eq(members.id, params.id));

	const updated = await db
		.select()
		.from(members)
		.where(eq(members.id, params.id))
		.limit(1);

	await logActivity(
		'member_updated',
		`${actor.name} a modifié ${updated[0].name}`,
		actor.id,
		{ memberId: params.id, changes: updates }
	);

	return json(updated[0]);
};

export const DELETE: RequestHandler = async ({ params, request, url }) => {
	const actor = await requireResponsable(request);
	const force = url.searchParams.get('force') === 'true';

	const existing = await db
		.select()
		.from(members)
		.where(eq(members.id, params.id))
		.limit(1);

	if (existing.length === 0) {
		error(404, { message: 'Membre introuvable' });
	}

	const member = existing[0];

	// Check for future assignments
	if (!force) {
		const today = new Date().toISOString().split('T')[0];
		const futureAssignments = await db
			.select({ date: saturdaySlots.date })
			.from(assignments)
			.innerJoin(saturdaySlots, eq(assignments.slotId, saturdaySlots.id))
			.where(
				and(
					eq(assignments.memberId, params.id),
					gt(saturdaySlots.date, today)
				)
			);

		if (futureAssignments.length > 0) {
			return json(
				{
					message: 'Ce membre est assigné à des samedis futurs',
					futureAssignments: futureAssignments.map((a) => a.date)
				},
				{ status: 409 }
			);
		}
	}

	await db
		.update(members)
		.set({ isActive: false })
		.where(eq(members.id, params.id));

	await logActivity(
		'member_removed',
		`${actor.name} a désactivé ${member.name}`,
		actor.id,
		{ memberId: params.id, memberName: member.name }
	);

	return json({ success: true });
};
