export interface OpenSaturday {
	date: string;
	requiredCount: number;
}

export interface PlanningAssignment {
	date: string;
	memberIds: string[];
}

/**
 * Generate an equitable planning distribution using weighted round-robin.
 *
 * Constraints:
 * - Max difference between members: 1 saturday
 * - Avoid assigning same person 2 consecutive saturdays (soft preference)
 * - If requiredCount > available members, assign all available
 */
export function generatePlanning(
	openSaturdays: OpenSaturday[],
	rotatingMemberIds: string[]
): PlanningAssignment[] {
	if (rotatingMemberIds.length === 0 || openSaturdays.length === 0) {
		return openSaturdays.map((s) => ({ date: s.date, memberIds: [] }));
	}

	// Sort chronologically
	const sorted = [...openSaturdays].sort((a, b) => a.date.localeCompare(b.date));

	// Track assignment counts per member
	const counts: Record<string, number> = {};
	for (const id of rotatingMemberIds) {
		counts[id] = 0;
	}

	// Track who was assigned to the previous saturday
	let lastAssigned = new Set<string>();

	const result: PlanningAssignment[] = [];

	for (const saturday of sorted) {
		const needed = Math.min(saturday.requiredCount, rotatingMemberIds.length);

		// Sort candidates: fewest assignments first, then prefer not-last-assigned, then stable order
		const candidates = [...rotatingMemberIds].sort((a, b) => {
			// Primary: fewest assignments
			const countDiff = counts[a] - counts[b];
			if (countDiff !== 0) return countDiff;

			// Secondary: prefer not assigned last saturday
			const aWasLast = lastAssigned.has(a) ? 1 : 0;
			const bWasLast = lastAssigned.has(b) ? 1 : 0;
			if (aWasLast !== bWasLast) return aWasLast - bWasLast;

			// Tertiary: stable order by ID
			return a.localeCompare(b);
		});

		const picked = candidates.slice(0, needed);

		for (const id of picked) {
			counts[id]++;
		}

		lastAssigned = new Set(picked);
		result.push({ date: saturday.date, memberIds: picked });
	}

	return result;
}
