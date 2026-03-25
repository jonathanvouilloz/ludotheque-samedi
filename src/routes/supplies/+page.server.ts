import { desc, asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { supplyNeeds, members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const supplies = await db
		.select()
		.from(supplyNeeds)
		.orderBy(asc(supplyNeeds.isPurchased), desc(supplyNeeds.urgency), desc(supplyNeeds.createdAt));

	const memberIds = new Set([
		...supplies.map((s) => s.addedBy).filter(Boolean),
		...supplies.map((s) => s.purchasedBy).filter(Boolean)
	]);

	const memberNames = new Map<string, string>();
	if (memberIds.size > 0) {
		const allMembers = await db.select({ id: members.id, name: members.name }).from(members);
		for (const m of allMembers) {
			memberNames.set(m.id, m.name);
		}
	}

	const suppliesWithNames = supplies.map((s) => ({
		...s,
		addedByName: s.addedBy ? memberNames.get(s.addedBy) ?? '?' : '?',
		purchasedByName: s.purchasedBy ? memberNames.get(s.purchasedBy) ?? null : null
	}));

	return { supplies: suppliesWithNames };
};
