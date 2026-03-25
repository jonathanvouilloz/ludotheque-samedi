import { ulid } from 'ulid';
import { db } from './db';
import { activityLog } from './schema';

export async function logActivity(
	type: string,
	description: string,
	actorId: string,
	metadata?: Record<string, unknown>
): Promise<void> {
	await db.insert(activityLog).values({
		id: ulid(),
		type,
		description,
		actorId,
		metadata: metadata ? JSON.stringify(metadata) : null
	});
}
