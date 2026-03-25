import { desc, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { gameWishes, members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const games = await db
		.select({
			id: gameWishes.id,
			name: gameWishes.name,
			link: gameWishes.link,
			price: gameWishes.price,
			addedBy: gameWishes.addedBy,
			isPurchased: gameWishes.isPurchased,
			purchasedBy: gameWishes.purchasedBy,
			purchasedAt: gameWishes.purchasedAt,
			createdAt: gameWishes.createdAt
		})
		.from(gameWishes)
		.orderBy(asc(gameWishes.isPurchased), desc(gameWishes.createdAt));

	// Fetch member names for display
	const memberIds = new Set([
		...games.map((g) => g.addedBy).filter(Boolean),
		...games.map((g) => g.purchasedBy).filter(Boolean)
	]);

	const memberNames = new Map<string, string>();
	if (memberIds.size > 0) {
		const allMembers = await db.select({ id: members.id, name: members.name }).from(members);
		for (const m of allMembers) {
			memberNames.set(m.id, m.name);
		}
	}

	const gamesWithNames = games.map((g) => ({
		...g,
		addedByName: g.addedBy ? memberNames.get(g.addedBy) ?? '?' : '?',
		purchasedByName: g.purchasedBy ? memberNames.get(g.purchasedBy) ?? null : null
	}));

	return { games: gamesWithNames };
};
