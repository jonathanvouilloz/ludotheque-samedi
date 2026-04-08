import { json, error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { proposals, events } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const actor = await requireResponsable(request);
	const existing = await db.select().from(proposals).where(eq(proposals.id, params.id)).limit(1);
	if (!existing[0]) error(404, { message: 'Proposition introuvable' });

	const body = await request.json().catch(() => ({}));
	const { deleteDeclined } = body as { deleteDeclined?: boolean };

	await db.transaction(async (tx) => {
		// Promote non-declined events to confirmed
		await tx
			.update(events)
			.set({ status: 'confirmed' })
			.where(and(eq(events.proposalId, params.id), eq(events.declined, false)));

		// Optionally delete declined events
		if (deleteDeclined) {
			await tx
				.delete(events)
				.where(and(eq(events.proposalId, params.id), eq(events.declined, true)));
		}

		await tx
			.update(proposals)
			.set({ status: 'confirmed', confirmedAt: new Date().toISOString() })
			.where(eq(proposals.id, params.id));
	});

	await logActivity(
		'proposal_confirmed',
		`${actor.name} a confirmé la proposition "${existing[0].title}"`,
		actor.id,
		{ proposalId: params.id, deleteDeclined: !!deleteDeclined }
	);

	return json({ success: true });
};
