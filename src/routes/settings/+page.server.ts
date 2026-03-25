import { db } from '$lib/server/db';
import { members } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allMembers = await db
		.select()
		.from(members)
		.orderBy(members.name);

	return { members: allMembers };
};
