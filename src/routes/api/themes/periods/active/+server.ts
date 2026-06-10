import { json } from '@sveltejs/kit';
import { eq, isNull, asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { themes, themeItems, themePeriods, checkups } from '$lib/server/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const activePeriods = await db
		.select()
		.from(themePeriods)
		.where(isNull(themePeriods.closedAt))
		.limit(1);

	if (!activePeriods[0]) {
		return json(null);
	}

	const period = activePeriods[0];

	const theme = await db.select().from(themes).where(eq(themes.id, period.themeId)).limit(1);

	const items = await db
		.select()
		.from(themeItems)
		.where(eq(themeItems.themeId, period.themeId))
		.orderBy(asc(themeItems.createdAt));

	const allCheckups = await db
		.select()
		.from(checkups)
		.where(eq(checkups.themePeriodId, period.id))
		.orderBy(asc(checkups.createdAt));

	return json({
		period,
		theme: theme[0],
		items,
		checkups: allCheckups
	});
};
