import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { schools, members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [allSchools, allMembers] = await Promise.all([
		db.select().from(schools).orderBy(asc(schools.name)),
		db
			.select({ id: members.id, name: members.name })
			.from(members)
			.where(eq(members.isActive, true))
			.orderBy(asc(members.name))
	]);
	return { schools: allSchools, members: allMembers };
};
