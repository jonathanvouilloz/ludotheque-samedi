import { json, error } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { schoolPeriods } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

const VALID_TYPES = ['vacation', 'holiday', 'pont', 'special'] as const;

export const GET: RequestHandler = async () => {
	const rows = await db.select().from(schoolPeriods).orderBy(asc(schoolPeriods.startDate));
	return json(rows);
};

export const POST: RequestHandler = async ({ request }) => {
	const actor = await requireResponsable(request);
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

	const id = ulid();
	const year = parseInt(startDate.slice(0, 4), 10);

	await db.insert(schoolPeriods).values({
		id,
		label: label.trim(),
		type,
		startDate,
		endDate,
		isBlocking: isBlocking ?? false,
		year
	});

	await logActivity(
		'period_created',
		`${actor.name} a ajouté la période "${label.trim()}" (${startDate} → ${endDate})`,
		actor.id,
		{ periodId: id, type }
	);

	return json({ success: true, id });
};
