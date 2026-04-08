import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { proposals, events } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import { today } from '$lib/utils/dates';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request }) => {
	await requireResponsable(request);
	const row = await db.select().from(proposals).where(eq(proposals.id, params.id)).limit(1);
	if (!row[0]) error(404, { message: 'Proposition introuvable' });

	// Auto-expire if deadline passed
	if (row[0].status === 'sent' && row[0].deadline < today()) {
		await db.update(proposals).set({ status: 'expired' }).where(eq(proposals.id, params.id));
		row[0].status = 'expired';
	}

	const eventRows = await db
		.select()
		.from(events)
		.where(eq(events.proposalId, params.id));

	return json({ proposal: row[0], events: eventRows });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await requireResponsable(request);
	const existing = await db.select().from(proposals).where(eq(proposals.id, params.id)).limit(1);
	if (!existing[0]) error(404, { message: 'Proposition introuvable' });

	const body = await request.json();
	const { title, deadline, message, status } = body as {
		title?: string;
		deadline?: string;
		message?: string | null;
		status?: string;
	};

	const updates: Record<string, unknown> = {};
	if (typeof title === 'string') updates.title = title.trim();
	if (typeof deadline === 'string') updates.deadline = deadline;
	if (message !== undefined) updates.message = message || null;
	if (typeof status === 'string') updates.status = status;

	if (Object.keys(updates).length > 0) {
		await db.update(proposals).set(updates).where(eq(proposals.id, params.id));
	}

	await logActivity(
		'proposal_updated',
		`${actor.name} a modifié la proposition "${existing[0].title}"`,
		actor.id,
		{ proposalId: params.id }
	);

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const actor = await requireResponsable(request);
	const existing = await db.select().from(proposals).where(eq(proposals.id, params.id)).limit(1);
	if (!existing[0]) error(404, { message: 'Proposition introuvable' });

	// Cascade delete via FK
	await db.delete(proposals).where(eq(proposals.id, params.id));

	await logActivity(
		'proposal_deleted',
		`${actor.name} a supprimé la proposition "${existing[0].title}"`,
		actor.id,
		{ proposalId: params.id }
	);

	return json({ success: true });
};
