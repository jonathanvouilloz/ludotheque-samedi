import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members, seasons } from '$lib/server/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [allMembers, allSeasons] = await Promise.all([
		db.select().from(members).where(eq(members.isActive, true)).orderBy(members.name),
		db.select({ name: seasons.name }).from(seasons)
	]);

	return {
		rotatingMembers: allMembers.filter((m) => !m.isPermanent),
		permanentMembers: allMembers.filter((m) => m.isPermanent),
		existingSeasonNames: allSeasons.map((s) => s.name)
	};
};
