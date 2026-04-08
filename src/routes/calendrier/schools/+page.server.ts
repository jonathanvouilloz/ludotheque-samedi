import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { schools } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(schools).orderBy(asc(schools.name));
	return { schools: rows };
};
