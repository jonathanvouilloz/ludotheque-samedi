import { json, error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	proposals,
	events,
	eventAssignments,
	schools,
	members
} from '$lib/server/schema';
import { today } from '$lib/utils/dates';
import type { RequestHandler } from './$types';

async function loadProposalByToken(token: string) {
	const row = await db
		.select({
			id: proposals.id,
			title: proposals.title,
			schoolId: proposals.schoolId,
			schoolName: schools.name,
			token: proposals.token,
			status: proposals.status,
			deadline: proposals.deadline,
			message: proposals.message
		})
		.from(proposals)
		.leftJoin(schools, eq(proposals.schoolId, schools.id))
		.where(eq(proposals.token, token))
		.limit(1);
	return row[0] ?? null;
}

export const GET: RequestHandler = async ({ params }) => {
	let proposal = await loadProposalByToken(params.token);
	if (!proposal) error(404, { message: 'Proposition introuvable' });

	// Auto-expire if deadline passed while sent
	if (proposal.status === 'sent' && proposal.deadline < today()) {
		await db.update(proposals).set({ status: 'expired' }).where(eq(proposals.id, proposal.id));
		proposal = { ...proposal, status: 'expired' };
	}

	// Only 'sent' and 'submitted' are readable (and confirmed/expired for display-only)
	if (proposal.status === 'draft') {
		error(404, { message: 'Proposition non disponible' });
	}

	const eventRows = await db
		.select()
		.from(events)
		.where(eq(events.proposalId, proposal.id))
		.orderBy(asc(events.date), asc(events.startTime));

	const assigns = await db
		.select({
			eventId: eventAssignments.eventId,
			memberName: members.name
		})
		.from(eventAssignments)
		.leftJoin(members, eq(eventAssignments.memberId, members.id));

	const byEvent = new Map<string, string[]>();
	for (const a of assigns) {
		if (!a.memberName) continue;
		if (!byEvent.has(a.eventId)) byEvent.set(a.eventId, []);
		byEvent.get(a.eventId)!.push(a.memberName);
	}

	// Strip sensitive fields (createdBy, schoolId, proposalId, recurrenceGroupId…)
	const publicEvents = eventRows.map((e) => ({
		id: e.id,
		date: e.date,
		startTime: e.startTime,
		endTime: e.endTime,
		location: e.location,
		classLabel: e.classLabel,
		contactName: e.contactName,
		contactEmail: e.contactEmail,
		ageRange: e.ageRange,
		childCount: e.childCount,
		notes: e.notes,
		declined: e.declined,
		memberNames: byEvent.get(e.id) ?? []
	}));

	return json({ proposal, events: publicEvents });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const proposal = await loadProposalByToken(params.token);
	if (!proposal) error(404, { message: 'Proposition introuvable' });

	// Only 'sent' or 'submitted' can be edited
	if (proposal.status !== 'sent' && proposal.status !== 'submitted') {
		error(403, { message: 'Proposition non modifiable' });
	}
	if (proposal.deadline < today()) {
		error(403, { message: 'Deadline dépassée' });
	}

	const body = await request.json();
	const {
		eventId,
		classLabel,
		contactName,
		contactEmail,
		ageRange,
		childCount,
		notes,
		declined
	} = body as {
		eventId?: string;
		classLabel?: string | null;
		contactName?: string | null;
		contactEmail?: string | null;
		ageRange?: string | null;
		childCount?: number | null;
		notes?: string | null;
		declined?: boolean;
	};

	if (!eventId) error(400, { message: 'eventId requis' });

	// Verify event belongs to this proposal
	const ev = await db
		.select()
		.from(events)
		.where(and(eq(events.id, eventId), eq(events.proposalId, proposal.id)))
		.limit(1);
	if (!ev[0]) error(404, { message: 'Créneau introuvable' });

	const updates: Record<string, unknown> = {};
	if (classLabel !== undefined) updates.classLabel = classLabel || null;
	if (contactName !== undefined) updates.contactName = contactName || null;
	if (contactEmail !== undefined) updates.contactEmail = contactEmail || null;
	if (ageRange !== undefined) updates.ageRange = ageRange || null;
	if (childCount !== undefined) updates.childCount = childCount ?? null;
	if (notes !== undefined) updates.notes = notes || null;
	if (typeof declined === 'boolean') updates.declined = declined;

	if (Object.keys(updates).length > 0) {
		await db.update(events).set(updates).where(eq(events.id, eventId));
	}

	return json({ success: true });
};
