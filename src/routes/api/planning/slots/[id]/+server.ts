import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { saturdaySlots, assignments } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import { formatSamedi } from '$lib/utils/dates';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await requireResponsable(request);

	const slot = await db
		.select()
		.from(saturdaySlots)
		.where(eq(saturdaySlots.id, params.id))
		.limit(1);

	if (!slot[0]) {
		error(404, { message: 'Samedi introuvable' });
	}

	const body = await request.json();
	const { isClosed, eventLabel } = body as {
		isClosed?: boolean;
		eventLabel?: string | null;
	};

	const updates: Record<string, unknown> = {};

	if (typeof isClosed === 'boolean') {
		updates.isClosed = isClosed;
	}

	if (eventLabel !== undefined) {
		updates.eventLabel = eventLabel || null;
	}

	if (Object.keys(updates).length === 0) {
		error(400, { message: 'Aucune modification' });
	}

	await db
		.update(saturdaySlots)
		.set(updates)
		.where(eq(saturdaySlots.id, params.id));

	// If closing: delete existing assignments
	const nowClosed = isClosed ?? slot[0].isClosed;
	if (nowClosed && !slot[0].isClosed) {
		await db
			.delete(assignments)
			.where(eq(assignments.slotId, params.id));
	}

	// Log activity
	const parts: string[] = [];
	if (typeof isClosed === 'boolean' && isClosed !== slot[0].isClosed) {
		parts.push(isClosed ? 'fermé' : 'ouvert');
	}
	if (eventLabel !== undefined && eventLabel !== slot[0].eventLabel) {
		parts.push(eventLabel ? `label "${eventLabel}"` : 'label supprimé');
	}

	if (parts.length > 0) {
		await logActivity(
			'slot_updated',
			`${actor.name} a modifié le ${formatSamedi(slot[0].date)} : ${parts.join(', ')}`,
			actor.id,
			{ slotId: params.id, date: slot[0].date, changes: updates }
		);
	}

	return json({ success: true });
};
