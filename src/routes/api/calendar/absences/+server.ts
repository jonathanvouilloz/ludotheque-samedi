import { json, error } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { absences } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

const VALID_TYPES = ['vacation', 'leave', 'training', 'unavailable'] as const;
const TYPE_LABELS: Record<string, string> = {
	vacation: 'vacances',
	leave: 'congé',
	training: 'formation',
	unavailable: 'indisponibilité'
};

export const GET: RequestHandler = async () => {
	const rows = await db.select().from(absences).orderBy(desc(absences.startDate));
	return json(rows);
};

export const POST: RequestHandler = async ({ request }) => {
	const actor = await getMemberFromRequest(request);
	if (!actor) error(401, { message: 'Identification requise' });
	if (!actor.isActive) error(403, { message: 'Compte désactivé' });

	const body = await request.json();
	const { memberId, type, startDate, endDate, startTime, endTime, requestNote } = body as {
		memberId?: string;
		type?: string;
		startDate?: string;
		endDate?: string;
		startTime?: string | null;
		endTime?: string | null;
		requestNote?: string | null;
	};

	if (!memberId) error(400, { message: 'Membre requis' });
	if (!type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
		error(400, { message: 'Type invalide' });
	}
	if (!startDate || !endDate) error(400, { message: 'Dates requises' });
	if (startDate > endDate) error(400, { message: 'Date de fin avant début' });
	if ((startTime || endTime) && startDate !== endDate) {
		error(400, { message: 'Les heures ne sont utilisables que sur un jour unique' });
	}

	const isResponsable = actor.label?.toLowerCase().includes('responsable') ?? false;
	if (memberId !== actor.id && !isResponsable) {
		error(403, { message: 'Seule la responsable peut saisir pour un autre membre' });
	}

	// Responsable saisit pour quelqu'un OU pour elle-même → direct approved
	const isSelfRequest = memberId === actor.id && !isResponsable;
	const status = isSelfRequest ? 'pending' : 'approved';

	const id = ulid();
	await db.insert(absences).values({
		id,
		memberId,
		type,
		startDate,
		endDate,
		startTime: startTime || null,
		endTime: endTime || null,
		status,
		requestNote: requestNote || null,
		requestedBy: actor.id,
		respondedBy: isSelfRequest ? null : actor.id,
		respondedAt: isSelfRequest ? null : new Date().toISOString()
	});

	await logActivity(
		isSelfRequest ? 'absence_requested' : 'absence_created',
		isSelfRequest
			? `${actor.name} a demandé ${TYPE_LABELS[type]} du ${startDate} au ${endDate}`
			: `${actor.name} a enregistré ${TYPE_LABELS[type]} du ${startDate} au ${endDate}`,
		actor.id,
		{ absenceId: id, memberId, type, startDate, endDate }
	);

	return json({ success: true, id, status });
};
