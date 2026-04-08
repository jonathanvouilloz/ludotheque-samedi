import { json, error } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { events, eventAssignments } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import { addDays } from '$lib/utils/dates';
import type { RequestHandler } from './$types';

const VALID_KINDS = ['accueil', 'internal'] as const;
const VALID_STATUS = ['draft', 'sent', 'confirmed'] as const;

export const GET: RequestHandler = async () => {
	const rows = await db.select().from(events).orderBy(asc(events.date), asc(events.startTime));
	const assigns = await db.select().from(eventAssignments);
	return json({ events: rows, assignments: assigns });
};

export const POST: RequestHandler = async ({ request }) => {
	const actor = await requireResponsable(request);
	const body = await request.json();
	const {
		title,
		kind,
		schoolId,
		classLabel,
		contactName,
		contactEmail,
		ageRange,
		childCount,
		date,
		startTime,
		endTime,
		location,
		status,
		notes,
		memberIds,
		recurrence
	} = body as {
		title?: string;
		kind?: string;
		schoolId?: string | null;
		classLabel?: string | null;
		contactName?: string | null;
		contactEmail?: string | null;
		ageRange?: string | null;
		childCount?: number | null;
		date?: string;
		startTime?: string;
		endTime?: string;
		location?: string | null;
		status?: string;
		notes?: string | null;
		memberIds?: string[];
		recurrence?: { weeks: number } | null;
	};

	if (!title?.trim()) error(400, { message: 'Titre requis' });
	if (!kind || !VALID_KINDS.includes(kind as (typeof VALID_KINDS)[number])) {
		error(400, { message: 'Type invalide' });
	}
	if (!date || !startTime || !endTime) error(400, { message: 'Date et heures requises' });
	if (startTime >= endTime) error(400, { message: 'Heure de fin avant début' });

	const finalStatus = status && VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])
		? status
		: 'draft';

	const weeks = recurrence?.weeks && recurrence.weeks > 1 ? Math.min(recurrence.weeks, 52) : 1;
	const recurrenceGroupId = weeks > 1 ? ulid() : null;

	const createdIds: string[] = [];

	await db.transaction(async (tx) => {
		for (let i = 0; i < weeks; i++) {
			const occurrenceDate = i === 0 ? date : addDays(date, i * 7);
			const id = ulid();
			createdIds.push(id);
			await tx.insert(events).values({
				id,
				title: title.trim(),
				kind,
				schoolId: schoolId || null,
				classLabel: classLabel || null,
				contactName: contactName || null,
				contactEmail: contactEmail || null,
				ageRange: ageRange || null,
				childCount: childCount ?? null,
				date: occurrenceDate,
				startTime,
				endTime,
				location: location || null,
				status: finalStatus,
				recurrenceGroupId,
				notes: notes || null,
				createdBy: actor.id
			});
			if (memberIds && memberIds.length > 0) {
				for (const memberId of memberIds) {
					await tx.insert(eventAssignments).values({
						id: ulid(),
						eventId: id,
						memberId
					});
				}
			}
		}
	});

	await logActivity(
		'event_created',
		weeks > 1
			? `${actor.name} a créé "${title.trim()}" (${weeks} occurrences)`
			: `${actor.name} a créé l'événement "${title.trim()}" le ${date}`,
		actor.id,
		{ eventIds: createdIds, recurrenceGroupId, weeks }
	);

	return json({ success: true, ids: createdIds, recurrenceGroupId });
};
