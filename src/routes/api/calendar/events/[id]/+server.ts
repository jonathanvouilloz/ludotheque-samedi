import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { events, eventAssignments } from '$lib/server/schema';
import { requireMember } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const row = await db.select().from(events).where(eq(events.id, params.id)).limit(1);
	if (!row[0]) error(404, { message: 'Événement introuvable' });
	const assigns = await db
		.select()
		.from(eventAssignments)
		.where(eq(eventAssignments.eventId, params.id));
	return json({ event: row[0], assignments: assigns });
};

export const PUT: RequestHandler = async ({ params, request, url }) => {
	const actor = await requireMember(request);
	const existing = await db.select().from(events).where(eq(events.id, params.id)).limit(1);
	if (!existing[0]) error(404, { message: 'Événement introuvable' });

	const scope = url.searchParams.get('scope') ?? 'one'; // 'one' | 'series'
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
		memberIds
	} = body as Record<string, unknown>;

	const updates: Record<string, unknown> = {};
	if (typeof title === 'string') updates.title = title.trim();
	if (typeof kind === 'string') updates.kind = kind;
	if (schoolId !== undefined) updates.schoolId = schoolId || null;
	if (classLabel !== undefined) updates.classLabel = classLabel || null;
	if (contactName !== undefined) updates.contactName = contactName || null;
	if (contactEmail !== undefined) updates.contactEmail = contactEmail || null;
	if (ageRange !== undefined) updates.ageRange = ageRange || null;
	if (childCount !== undefined) updates.childCount = childCount ?? null;
	if (typeof date === 'string') updates.date = date;
	if (typeof startTime === 'string') updates.startTime = startTime;
	if (typeof endTime === 'string') updates.endTime = endTime;
	if (location !== undefined) updates.location = location || null;
	if (typeof status === 'string') updates.status = status;
	if (notes !== undefined) updates.notes = notes || null;

	await db.transaction(async (tx) => {
		if (scope === 'series' && existing[0].recurrenceGroupId) {
			// Update series except date (which is unique per occurrence)
			const seriesUpdates = { ...updates };
			delete seriesUpdates.date;
			if (Object.keys(seriesUpdates).length > 0) {
				await tx
					.update(events)
					.set(seriesUpdates)
					.where(eq(events.recurrenceGroupId, existing[0].recurrenceGroupId));
			}
			// Still apply date update only to this occurrence
			if (updates.date) {
				await tx.update(events).set({ date: updates.date as string }).where(eq(events.id, params.id));
			}
		} else {
			if (Object.keys(updates).length > 0) {
				await tx.update(events).set(updates).where(eq(events.id, params.id));
			}
		}

		// Replace assignments if memberIds provided
		if (Array.isArray(memberIds)) {
			const targetEventIds =
				scope === 'series' && existing[0].recurrenceGroupId
					? (
							await tx
								.select({ id: events.id })
								.from(events)
								.where(eq(events.recurrenceGroupId, existing[0].recurrenceGroupId))
						).map((r) => r.id)
					: [params.id];
			for (const eid of targetEventIds) {
				await tx.delete(eventAssignments).where(eq(eventAssignments.eventId, eid));
				for (const mid of memberIds as string[]) {
					await tx.insert(eventAssignments).values({ id: ulid(), eventId: eid, memberId: mid });
				}
			}
		}
	});

	await logActivity(
		'event_updated',
		`${actor.name} a modifié "${existing[0].title}"${scope === 'series' ? ' (toute la série)' : ''}`,
		actor.id,
		{ eventId: params.id, scope }
	);

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, request, url }) => {
	const actor = await requireMember(request);
	const existing = await db.select().from(events).where(eq(events.id, params.id)).limit(1);
	if (!existing[0]) error(404, { message: 'Événement introuvable' });

	const scope = url.searchParams.get('scope') ?? 'one';

	if (scope === 'series' && existing[0].recurrenceGroupId) {
		await db
			.delete(events)
			.where(eq(events.recurrenceGroupId, existing[0].recurrenceGroupId));
	} else {
		await db.delete(events).where(eq(events.id, params.id));
	}

	await logActivity(
		'event_deleted',
		`${actor.name} a supprimé "${existing[0].title}"${scope === 'series' ? ' (toute la série)' : ''}`,
		actor.id,
		{ eventId: params.id, scope }
	);

	return json({ success: true });
};
