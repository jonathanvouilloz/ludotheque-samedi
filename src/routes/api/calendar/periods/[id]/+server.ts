import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { schoolPeriods } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

const VALID_TYPES = ['vacation', 'holiday', 'pont', 'special'] as const;

export const PUT: RequestHandler = async ({ params, request }) => {
	const actor = await requireResponsable(request);
	const existing = await db
		.select()
		.from(schoolPeriods)
		.where(eq(schoolPeriods.id, params.id))
		.limit(1);
	if (!existing[0]) error(404, { message: 'Période introuvable' });

	const body = await request.json();
	const { label, type, startDate, endDate, isBlocking } = body as {
		label?: string;
		type?: string;
		startDate?: string;
		endDate?: string;
		isBlocking?: boolean;
	};

	if (!label?.trim()) error(400, { message: 'Label requis' });
	if (!type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
		error(400, { message: 'Type invalide' });
	}
	if (!startDate || !endDate) error(400, { message: 'Dates requises' });
	if (startDate > endDate) error(400, { message: 'Date de fin avant début' });

	const year = parseInt(startDate.slice(0, 4), 10);

	await db
		.update(schoolPeriods)
		.set({
			label: label.trim(),
			type,
			startDate,
			endDate,
			isBlocking: isBlocking ?? false,
			year
		})
		.where(eq(schoolPeriods.id, params.id));

	await logActivity(
		'period_updated',
		`${actor.name} a modifié la période "${label.trim()}"`,
		actor.id,
		{ periodId: params.id }
	);

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const actor = await requireResponsable(request);
	const existing = await db
		.select()
		.from(schoolPeriods)
		.where(eq(schoolPeriods.id, params.id))
		.limit(1);
	if (!existing[0]) error(404, { message: 'Période introuvable' });

	await db.delete(schoolPeriods).where(eq(schoolPeriods.id, params.id));

	await logActivity(
		'period_deleted',
		`${actor.name} a supprimé la période "${existing[0].label}"`,
		actor.id,
		{ periodId: params.id }
	);

	return json({ success: true });
};
