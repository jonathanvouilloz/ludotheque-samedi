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

	if (existing[0].status === 'confirmed') {
		error(409, { message: 'Proposition déjà confirmée' });
	}

	await db.transaction(async (tx) => {
		await tx.update(proposals).set({ status: 'sent' }).where(eq(proposals.id, params.id));
		// Events passent à 'sent' aussi pour signaler qu'ils sont en cours d'attribution
		await tx
			.update(events)
			.set({ status: 'sent' })
			.where(and(eq(events.proposalId, params.id), eq(events.status, 'draft')));
	});

	await logActivity(
		'proposal_sent',
		`${actor.name} a activé le lien de la proposition "${existing[0].title}"`,
		actor.id,
		{ proposalId: params.id }
	);

	return json({ success: true });
};
