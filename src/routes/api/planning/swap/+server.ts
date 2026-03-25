import { json, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { assignments, saturdaySlots, members } from '$lib/server/schema';
import { getMemberFromRequest } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';
import { formatSamedi, today } from '$lib/utils/dates';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	// 1. Identify actor
	const actor = await getMemberFromRequest(request);
	if (!actor || !actor.isActive) {
		error(401, { message: 'Identification requise' });
	}

	// 3. Parse body
	const body = await request.json();
	const { fromSlotId, toSlotId, toMemberId, fromMemberId: rawFromMemberId } = body as {
		fromSlotId: string;
		toSlotId: string;
		toMemberId: string;
		fromMemberId?: string;
	};

	// 2. Determine swap initiator (admin swap or self swap)
	const isAdminSwap = rawFromMemberId && rawFromMemberId !== actor.id;
	let swapMemberId = actor.id;
	let swapMemberName = actor.name;

	if (isAdminSwap) {
		// Verify actor is responsable
		if (!actor.label?.toLowerCase().includes('responsable')) {
			error(403, { message: 'Seul la responsable peut échanger pour un autre membre' });
		}
		swapMemberId = rawFromMemberId;
		// Fetch from member name
		const fromMemberResult = await db
			.select()
			.from(members)
			.where(eq(members.id, rawFromMemberId))
			.limit(1);
		if (!fromMemberResult[0]) {
			error(404, { message: 'Membre source introuvable' });
		}
		swapMemberName = fromMemberResult[0].name;
	} else {
		// Block permanent members for self-swap only
		if (actor.isPermanent) {
			error(403, { message: 'Les membres permanents ne peuvent pas échanger de samedis' });
		}
	}

	if (!fromSlotId || !toSlotId || !toMemberId) {
		error(400, { message: 'Paramètres manquants' });
	}

	if (fromSlotId === toSlotId) {
		error(400, { message: 'Impossible d\'échanger sur le même samedi' });
	}

	// 4. Fetch both slots
	const [fromSlotResult, toSlotResult] = await Promise.all([
		db.select().from(saturdaySlots).where(eq(saturdaySlots.id, fromSlotId)).limit(1),
		db.select().from(saturdaySlots).where(eq(saturdaySlots.id, toSlotId)).limit(1)
	]);

	const fromSlot = fromSlotResult[0];
	const toSlot = toSlotResult[0];

	if (!fromSlot || !toSlot) {
		error(404, { message: 'Samedi introuvable' });
	}

	if (fromSlot.isClosed || toSlot.isClosed) {
		error(400, { message: 'Impossible d\'échanger un samedi fermé' });
	}

	const todayStr = today();
	if (fromSlot.date < todayStr || toSlot.date < todayStr) {
		error(400, { message: 'Impossible d\'échanger un samedi passé' });
	}

	// 5. Verify assignments exist
	const [swapMemberAssignment, targetAssignment] = await Promise.all([
		db
			.select()
			.from(assignments)
			.where(and(eq(assignments.slotId, fromSlotId), eq(assignments.memberId, swapMemberId)))
			.limit(1),
		db
			.select()
			.from(assignments)
			.where(and(eq(assignments.slotId, toSlotId), eq(assignments.memberId, toMemberId)))
			.limit(1)
	]);

	if (!swapMemberAssignment[0]) {
		error(400, { message: isAdminSwap ? 'Ce membre n\'est pas assigné à ce samedi' : 'Tu n\'es pas assigné à ce samedi' });
	}

	if (!targetAssignment[0]) {
		error(400, { message: 'Ce membre n\'est pas assigné à ce samedi' });
	}

	// 6. Check swap member not already on target slot
	const alreadyOnTarget = await db
		.select()
		.from(assignments)
		.where(and(eq(assignments.slotId, toSlotId), eq(assignments.memberId, swapMemberId)))
		.limit(1);

	if (alreadyOnTarget[0]) {
		error(409, { message: isAdminSwap ? 'Ce membre est déjà assigné à ce samedi' : 'Tu es déjà assigné à ce samedi' });
	}

	// 7. Get target member name for logging
	const toMemberResult = await db
		.select()
		.from(members)
		.where(eq(members.id, toMemberId))
		.limit(1);
	const toMember = toMemberResult[0];

	if (!toMember) {
		error(404, { message: 'Membre cible introuvable' });
	}

	// 8. Execute swap in transaction
	await db.transaction(async (tx) => {
		// Delete old assignments
		await tx
			.delete(assignments)
			.where(and(eq(assignments.slotId, fromSlotId), eq(assignments.memberId, swapMemberId)));
		await tx
			.delete(assignments)
			.where(and(eq(assignments.slotId, toSlotId), eq(assignments.memberId, toMemberId)));

		// Create swapped assignments
		await tx.insert(assignments).values([
			{ id: ulid(), slotId: fromSlotId, memberId: toMemberId },
			{ id: ulid(), slotId: toSlotId, memberId: swapMemberId }
		]);
	});

	// 9. Log activity
	const description = isAdminSwap
		? `${actor.name} a échangé ${swapMemberName} le ${formatSamedi(fromSlot.date)} avec ${toMember.name} le ${formatSamedi(toSlot.date)}`
		: `${actor.name} a échangé le ${formatSamedi(fromSlot.date)} avec ${toMember.name} le ${formatSamedi(toSlot.date)}`;

	await logActivity(
		'swap',
		description,
		actor.id,
		{
			fromSlotId,
			toSlotId,
			fromDate: fromSlot.date,
			toDate: toSlot.date,
			fromMemberId: swapMemberId,
			toMemberId,
			isAdminSwap: !!isAdminSwap
		}
	);

	return json({ success: true });
};
