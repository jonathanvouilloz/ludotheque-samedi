import { asc, desc, eq, isNull, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { themes, themeItems, themePeriods, checkups, checkupEntries, members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const activePeriods = await db
		.select()
		.from(themePeriods)
		.where(isNull(themePeriods.closedAt))
		.limit(1);

	let activePeriod = activePeriods[0] ?? null;
	let activeTheme = null;
	let activeItems: ((typeof themeItems.$inferSelect) & { lastStatus: string | null; lastStatusResolved: boolean })[] = [];
	let recentCheckups: ((typeof checkups.$inferSelect) & { doneByName: string; unresolvedCount: number })[] = [];
	let unresolvedProblems: { itemName: string; status: string; entryId: string; checkupId: string }[] = [];

	if (activePeriod) {
		const themeResult = await db
			.select()
			.from(themes)
			.where(eq(themes.id, activePeriod.themeId))
			.limit(1);
		activeTheme = themeResult[0] ?? null;

		const rawItems = await db
			.select()
			.from(themeItems)
			.where(and(eq(themeItems.themeId, activePeriod.themeId), eq(themeItems.isArchived, false)))
			.orderBy(asc(themeItems.createdAt));

		const allCheckups = await db
			.select()
			.from(checkups)
			.where(eq(checkups.themePeriodId, activePeriod.id))
			.orderBy(desc(checkups.createdAt));

		const memberIds = new Set<string>(
			allCheckups.map((c) => c.doneBy).filter(Boolean) as string[]
		);
		const memberNames = new Map<string, string>();
		if (memberIds.size > 0) {
			const allMembers = await db.select({ id: members.id, name: members.name }).from(members);
			allMembers.forEach((m) => memberNames.set(m.id, m.name));
		}

		// Fetch entries of last completed checkup to get per-item status
		const lastCompleted = allCheckups.find((c) => c.completedAt);
		const lastEntries = lastCompleted
			? await db
					.select()
					.from(checkupEntries)
					.where(eq(checkupEntries.checkupId, lastCompleted.id))
			: [];

		const lastStatusByItemId = new Map<string, { status: string; resolvedAt: string | null; entryId: string }>();
		for (const e of lastEntries) {
			if (e.themeItemId) {
				lastStatusByItemId.set(e.themeItemId, { status: e.status, resolvedAt: e.resolvedAt, entryId: e.id });
		  }
		}

		activeItems = rawItems.map((item) => {
			const s = lastStatusByItemId.get(item.id);
			return {
				...item,
				lastStatus: s?.status ?? null,
				lastStatusResolved: s ? !!s.resolvedAt : false
			};
		});

		// Unresolved problems from last completed checkup
		if (lastCompleted) {
			const itemNamesMap = new Map(rawItems.map((i) => [i.id, i.name]));
			unresolvedProblems = lastEntries
				.filter(
					(e) =>
						(e.status === 'broken' || e.status === 'missing' || e.status === 'needs_more') &&
						!e.resolvedAt
				)
				.map((e) => ({
					itemName: e.themeItemId ? (itemNamesMap.get(e.themeItemId) ?? '?') : '?',
					status: e.status,
					entryId: e.id,
					checkupId: lastCompleted.id
				}));
		}

		// Build checkup list with unresolved counts
		recentCheckups = await Promise.all(
			allCheckups.map(async (c) => {
				const entries = c.completedAt
					? await db.select().from(checkupEntries).where(eq(checkupEntries.checkupId, c.id))
					: [];
				const unresolvedCount = entries.filter(
					(e) =>
						(e.status === 'broken' || e.status === 'missing' || e.status === 'needs_more') &&
						!e.resolvedAt
				).length;
				return {
					...c,
					doneByName: c.doneBy ? (memberNames.get(c.doneBy) ?? '?') : '?',
					unresolvedCount
				};
			})
		);
	}

	const allThemes = await db.select().from(themes).orderBy(asc(themes.name));

	return { activePeriod, activeTheme, activeItems, recentCheckups, unresolvedProblems, allThemes };
};
