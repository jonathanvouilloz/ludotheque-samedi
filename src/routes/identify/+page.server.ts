import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const activeMembers = await db
		.select()
		.from(members)
		.where(eq(members.isActive, true))
		.orderBy(members.name);

	return { members: activeMembers };
};
