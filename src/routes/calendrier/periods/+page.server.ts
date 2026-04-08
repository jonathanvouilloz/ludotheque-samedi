import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { schoolPeriods } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(schoolPeriods).orderBy(asc(schoolPeriods.startDate));
	return { periods: rows };
};
