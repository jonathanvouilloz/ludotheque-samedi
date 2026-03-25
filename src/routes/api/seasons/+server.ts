import { json, error } from '@sveltejs/kit';
import { desc, eq, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { seasons, saturdaySlots, assignments, members } from '$lib/server/schema';
import { requireResponsable } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import { getSaturdaysBetween } from '$lib/utils/dates';
import { generatePlanning } from '$lib/utils/planning';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await db
		.select()
		.from(seasons)
		.orderBy(desc(seasons.startDate));

	return json(result);
};

export const POST: RequestHandler = async ({ request }) => {
	const actor = await requireResponsable(request);
	const body = await request.json();

	// Validate inputs
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const startDate = typeof body.startDate === 'string' ? body.startDate : '';
	const endDate = typeof body.endDate === 'string' ? body.endDate : '';
	const defaultSlots = typeof body.defaultSlots === 'number' ? body.defaultSlots : 2;
	const closedDates: string[] = Array.isArray(body.closedDates) ? body.closedDates : [];
	const events: Array<{ date: string; label: string; requiredCount: number }> =
		Array.isArray(body.events) ? body.events : [];
	const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];

	if (!name) error(400, { message: 'Le nom de la saison est obligatoire' });
	if (!startDate || !endDate) error(400, { message: 'Les dates de début et fin sont obligatoires' });
	if (startDate >= endDate) error(400, { message: 'La date de début doit précéder la date de fin' });
	if (defaultSlots < 1) error(400, { message: 'Il faut au moins 1 slot par samedi' });

	// Generate all saturdays
	const allSaturdays = getSaturdaysBetween(startDate, endDate);
	if (allSaturdays.length === 0) error(400, { message: 'Aucun samedi trouvé dans cette période' });

	// Build lookup sets
	const closedSet = new Set(closedDates);
	const eventMap = new Map(events.map((e) => [e.date, e]));

	// Create season
	const seasonId = ulid();

	// Build slots
	const slotRecords = allSaturdays.map((date) => {
		const event = eventMap.get(date);
		const isClosed = closedSet.has(date);
		return {
			id: ulid(),
			seasonId,
			date,
			type: isClosed ? 'closed' : event ? 'event' : 'normal',
			eventLabel: event?.label ?? null,
			requiredCount: event?.requiredCount ?? null,
			isClosed
		};
	});

	// Open saturdays for planning
	const openSlots = slotRecords.filter((s) => !s.isClosed);
	const openSaturdays = openSlots.map((s) => ({
		date: s.date,
		requiredCount: s.requiredCount ?? defaultSlots
	}));

	// Run planning algorithm for rotating members
	const planningResult = generatePlanning(openSaturdays, memberIds);

	// Build date→slotId lookup
	const dateToSlotId = new Map(slotRecords.map((s) => [s.date, s.id]));

	// Build assignments from algorithm
	const assignmentRecords: Array<{ id: string; slotId: string; memberId: string }> = [];
	for (const pa of planningResult) {
		const slotId = dateToSlotId.get(pa.date);
		if (!slotId) continue;
		for (const memberId of pa.memberIds) {
			assignmentRecords.push({ id: ulid(), slotId, memberId });
		}
	}

	// Add permanent members to all open slots
	const permanentMembers = await db
		.select()
		.from(members)
		.where(and(eq(members.isPermanent, true), eq(members.isActive, true)));

	for (const slot of openSlots) {
		for (const pm of permanentMembers) {
			// Avoid duplicate if permanent member is also in rotating list
			const alreadyAssigned = assignmentRecords.some(
				(a) => a.slotId === slot.id && a.memberId === pm.id
			);
			if (!alreadyAssigned) {
				assignmentRecords.push({ id: ulid(), slotId: slot.id, memberId: pm.id });
			}
		}
	}

	// Insert everything in a transaction
	await db.transaction(async (tx) => {
		await tx.insert(seasons).values({
			id: seasonId,
			name,
			startDate,
			endDate,
			defaultSlots
		});

		if (slotRecords.length > 0) {
			await tx.insert(saturdaySlots).values(slotRecords);
		}

		if (assignmentRecords.length > 0) {
			await tx.insert(assignments).values(assignmentRecords);
		}
	});

	await logActivity(
		'season_created',
		`${actor.name} a créé la saison ${name}`,
		actor.id,
		{ seasonId, period: `${startDate} → ${endDate}`, saturdays: allSaturdays.length }
	);

	return json({ id: seasonId, name, startDate, endDate, defaultSlots }, { status: 201 });
};
