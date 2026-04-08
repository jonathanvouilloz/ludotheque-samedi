import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { absences, members } from '$lib/server/schema';
import { getMemberFromRequest, requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });

	const existing = await db
		.select()
		.from(absences)
		.where(eq(absences.id, params.id))
		.limit(1);
	if (!existing[0]) error(404, { message: 'Absence introuvable' });

	const isResponsable = actor.label?.toLowerCase().includes('responsable') ?? false;
	// L'auteur peut supprimer sa propre demande pending ; la responsable peut tout supprimer
	const isOwnPending =
		existing[0].requestedBy === actor.id && existing[0].status === 'pending';
	if (!isResponsable && !isOwnPending) {
		error(403, { message: 'Non autorisé' });
	}

	await db.delete(absences).where(eq(absences.id, params.id));

	await logActivity(
		'absence_deleted',
		`${actor.name} a supprimé une absence`,
		actor.id,
		{ absenceId: params.id }
	);

	return json({ success: true });
};

// PUT decision (approve/reject) — admin only
export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await requireResponsable(request);
	const body = await request.json();
	const { status, responseNote } = body as {
		status?: 'approved' | 'rejected';
		responseNote?: string | null;
	};
	if (status !== 'approved' && status !== 'rejected') {
		error(400, { message: 'Statut invalide' });
	}

	const existing = await db
		.select()
		.from(absences)
		.where(eq(absences.id, params.id))
		.limit(1);
	if (!existing[0]) error(404, { message: 'Absence introuvable' });

	await db
		.update(absences)
		.set({
			status,
			responseNote: responseNote || null,
			respondedBy: actor.id,
			respondedAt: new Date().toISOString()
		})
		.where(eq(absences.id, params.id));

	// Get member name for log
	const memberRow = await db
		.select({ name: members.name })
		.from(members)
		.where(eq(members.id, existing[0].memberId))
		.limit(1);
	const memberName = memberRow[0]?.name ?? '?';

	await logActivity(
		status === 'approved' ? 'absence_approved' : 'absence_rejected',
		`${actor.name} a ${status === 'approved' ? 'approuvé' : 'refusé'} l'absence de ${memberName} (${existing[0].startDate} → ${existing[0].endDate})`,
		actor.id,
		{ absenceId: params.id, memberId: existing[0].memberId, status }
	);

	return json({ success: true });
};
