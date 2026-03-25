import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { members } from './schema';
import type { Member } from './schema';

export async function getMemberFromRequest(request: Request): Promise<Member | null> {
	const memberId = request.headers.get('x-member-id');
	if (!memberId) return null;

	const result = await db
		.select()
		.from(members)
		.where(eq(members.id, memberId))
		.limit(1);

	return result[0] ?? null;
}

export async function requireResponsable(request: Request): Promise<Member> {
	const member = await getMemberFromRequest(request);

	if (!member) {
		error(401, { message: 'Identification requise' });
	}

	if (!member.isActive) {
		error(403, { message: 'Ce compte a été désactivé' });
	}

	if (!member.label?.toLowerCase().includes('responsable')) {
		error(403, { message: 'Accès réservé aux responsables' });
	}

	return member;
}
