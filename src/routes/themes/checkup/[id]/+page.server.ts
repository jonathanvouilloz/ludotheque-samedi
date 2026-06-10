import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { checkups, checkupEntries, themeItems, themePeriods, themes, members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const checkupResult = await db
		.select()
		.from(checkups)
		.where(eq(checkups.id, params.id))
		.limit(1);

	if (!checkupResult[0]) error(404, 'Check-up introuvable');
	const checkup = checkupResult[0];

	const entries = await db
		.select()
		.from(checkupEntries)
		.where(eq(checkupEntries.checkupId, checkup.id));

	// Fetch all referenced item + member names in bulk
	const itemIds = entries.map((e) => e.themeItemId).filter(Boolean) as string[];
	const memberIds = new Set<string>();
	if (checkup.doneBy) memberIds.add(checkup.doneBy);
	for (const e of entries) {
		if (e.resolvedBy) memberIds.add(e.resolvedBy);
	}

	const itemNames = new Map<string, string>();
	if (itemIds.length > 0) {
		const allItems = await db.select({ id: themeItems.id, name: themeItems.name }).from(themeItems);
		allItems.forEach((i) => itemNames.set(i.id, i.name));
	}

	const memberNameMap = new Map<string, string>();
	if (memberIds.size > 0) {
		const allMembers = await db.select({ id: members.id, name: members.name }).from(members);
		allMembers.forEach((m) => memberNameMap.set(m.id, m.name));
	}

	// Period + theme info
	const periodResult = await db
		.select()
		.from(themePeriods)
		.where(eq(themePeriods.id, checkup.themePeriodId))
		.limit(1);
	const period = periodResult[0] ?? null;

	let themeName = '';
	let themeId = '';
	if (period) {
		const themeResult = await db.select().from(themes).where(eq(themes.id, period.themeId)).limit(1);
		themeName = themeResult[0]?.name ?? '';
		themeId = period.themeId;
	}

	const doneByName = checkup.doneBy ? (memberNameMap.get(checkup.doneBy) ?? '?') : '';

	const enrichedEntries = entries.map((e) => ({
		...e,
		itemName: e.themeItemId ? (itemNames.get(e.themeItemId) ?? '?') : null,
		resolvedByName: e.resolvedBy ? (memberNameMap.get(e.resolvedBy) ?? '?') : null
	}));

	return { checkup, entries: enrichedEntries, themeName, themeId, doneByName };
};
