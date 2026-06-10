import { redirect } from '@sveltejs/kit';
import { asc, eq, isNull, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { themes, themeItems, themePeriods } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const activePeriods = await db
		.select()
		.from(themePeriods)
		.where(isNull(themePeriods.closedAt))
		.limit(1);

	if (!activePeriods[0]) {
		redirect(302, '/themes');
	}

	const period = activePeriods[0];

	const themeResult = await db
		.select()
		.from(themes)
		.where(eq(themes.id, period.themeId))
		.limit(1);

	const items = await db
		.select()
		.from(themeItems)
		.where(and(eq(themeItems.themeId, period.themeId), eq(themeItems.isArchived, false)))
		.orderBy(asc(themeItems.createdAt));

	return { period, theme: themeResult[0], items };
};
