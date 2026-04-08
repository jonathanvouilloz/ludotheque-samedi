import { json, error } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { proposals, events, eventAssignments, schools } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import { addDays } from '$lib/utils/dates';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	await requireResponsable(request);
	const rows = await db
		.select({
			id: proposals.id,
			title: proposals.title,
			schoolId: proposals.schoolId,
			schoolName: schools.name,
			token: proposals.token,
			status: proposals.status,
			deadline: proposals.deadline,
			createdAt: proposals.createdAt,
			submittedAt: proposals.submittedAt,
			confirmedAt: proposals.confirmedAt
		})
		.from(proposals)
		.leftJoin(schools, eq(proposals.schoolId, schools.id))
		.orderBy(desc(proposals.createdAt));
	return json(rows);
};

interface SlotInput {
	date: string;
	startTime: string;
	endTime: string;
	location?: string | null;
	memberIds?: string[];
	recurrenceWeeks?: number;
}

export const POST: RequestHandler = async ({ request }) => {
	const actor = await requireResponsable(request);
	const body = await request.json();
	const { title, schoolId, deadline, message, slots } = body as {
		title?: string;
		schoolId?: string;
		deadline?: string;
		message?: string | null;
		slots?: SlotInput[];
	};

	if (!title?.trim()) error(400, { message: 'Titre requis' });
	if (!schoolId) error(400, { message: 'École requise' });
	if (!deadline) error(400, { message: 'Deadline requise' });
	if (!Array.isArray(slots) || slots.length === 0) {
		error(400, { message: 'Au moins un créneau requis' });
	}

	// Verify school exists
	const schoolRow = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
	if (!schoolRow[0]) error(404, { message: 'École introuvable' });

	const proposalId = ulid();
	const token = ulid();

	const createdEventIds: string[] = [];

	await db.transaction(async (tx) => {
		await tx.insert(proposals).values({
			id: proposalId,
			title: title.trim(),
			schoolId,
			token,
			status: 'draft',
			deadline,
			message: message || null,
			createdBy: actor.id
		});

		for (const slot of slots) {
			if (!slot.date || !slot.startTime || !slot.endTime) continue;
			if (slot.startTime >= slot.endTime) continue;

			const weeks = slot.recurrenceWeeks && slot.recurrenceWeeks > 1 ? Math.min(slot.recurrenceWeeks, 52) : 1;
			const recurrenceGroupId = weeks > 1 ? ulid() : null;

			for (let i = 0; i < weeks; i++) {
				const occurrenceDate = i === 0 ? slot.date : addDays(slot.date, i * 7);
				const eventId = ulid();
				createdEventIds.push(eventId);
				await tx.insert(events).values({
					id: eventId,
					title: title.trim(),
					kind: 'accueil',
					schoolId,
					proposalId,
					declined: false,
					date: occurrenceDate,
					startTime: slot.startTime,
					endTime: slot.endTime,
					location: slot.location || null,
					status: 'draft',
					recurrenceGroupId,
					createdBy: actor.id
				});
				if (slot.memberIds && slot.memberIds.length > 0) {
					for (const memberId of slot.memberIds) {
						await tx.insert(eventAssignments).values({
							id: ulid(),
							eventId,
							memberId
						});
					}
				}
			}
		}
	});

	await logActivity(
		'proposal_created',
		`${actor.name} a créé la proposition "${title.trim()}" pour ${schoolRow[0].name} (${createdEventIds.length} créneaux)`,
		actor.id,
		{ proposalId, schoolId, eventCount: createdEventIds.length }
	);

	return json({ success: true, id: proposalId, token });
};
