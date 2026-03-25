import 'dotenv/config';
import XLSX from 'xlsx';
import { drizzle } from 'drizzle-orm/libsql';
import { ulid } from 'ulid';
import { members, seasons, saturdaySlots, assignments } from '../src/lib/server/schema';

// ── DB connection ───────────────────────────────────────────────────
const db = drizzle({
	connection: {
		url: process.env.TURSO_DATABASE_URL!,
		authToken: process.env.TURSO_AUTH_TOKEN ?? ''
	}
});

// ── Read Excel ──────────────────────────────────────────────────────
const wb = XLSX.readFile('répartition samedi.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows: (string | null | undefined)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

// ── Parse date (M/D/YY → YYYY-MM-DD) ───────────────────────────────
function parseDate(raw: string): string {
	const parts = raw.split('/');
	if (parts.length !== 3) throw new Error(`Invalid date: ${raw}`);
	const month = parts[0].padStart(2, '0');
	const day = parts[1].padStart(2, '0');
	const year = parseInt(parts[2]) < 100 ? `20${parts[2]}` : parts[2];
	return `${year}-${month}-${day}`;
}

// ── Special event keywords ──────────────────────────────────────────
const EVENTS: Record<string, { type: string; label: string; closed: boolean }> = {
	'PORTES OUVERTES DES LUDOS': { type: 'event', label: 'Portes ouvertes des ludos', closed: false },
	'FERMETURE ÉTÉ': { type: 'normal', label: 'Fermeture été', closed: true },
	'RÉOUVERTURE': { type: 'event', label: 'Réouverture', closed: false }
};

// ── Known members ───────────────────────────────────────────────────
const MEMBERS_CONFIG: { name: string; isPermanent: boolean; label: string | null }[] = [
	{ name: 'Alessia', isPermanent: false, label: 'Responsable' },
	{ name: 'Eduardo', isPermanent: false, label: null },
	{ name: 'Franziska', isPermanent: false, label: null },
	{ name: 'Gabriel', isPermanent: true, label: null },
	{ name: 'Jonathan', isPermanent: false, label: null },
	{ name: 'Sadjia', isPermanent: false, label: null },
	{ name: 'Zaineb', isPermanent: false, label: null }
];

async function seed(): Promise<void> {
	console.log('Seeding database...\n');

	// 0. Clear existing data
	await db.delete(assignments);
	await db.delete(saturdaySlots);
	await db.delete(seasons);
	await db.delete(members);
	console.log('✓ Tables vidées');

	// 1. Create members
	const memberMap = new Map<string, string>(); // name → id
	for (const m of MEMBERS_CONFIG) {
		const id = ulid();
		memberMap.set(m.name, id);
		await db.insert(members).values({
			id,
			name: m.name,
			label: m.label,
			isPermanent: m.isPermanent,
			isActive: true
		});
	}
	console.log(`✓ ${MEMBERS_CONFIG.length} membres créés`);

	// 2. Create season
	const seasonId = ulid();
	await db.insert(seasons).values({
		id: seasonId,
		name: 'Saison 25-26',
		startDate: '2025-08-23',
		endDate: '2026-08-15',
		defaultSlots: 3
	});
	console.log('✓ Saison 25-26 créée');

	// 3. Parse rows and create slots + assignments
	let slotCount = 0;
	let assignmentCount = 0;
	let closedCount = 0;
	let eventCount = 0;

	for (let i = 1; i < rows.length; i++) {
		const row = rows[i];
		if (!row || !row[1]) continue; // skip empty rows

		const rawDate = row[1].trim();
		if (!rawDate || !rawDate.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) continue;

		const date = parseDate(rawDate);
		const col2 = row[2]?.trim() ?? '';
		const col3 = row[3]?.trim() ?? '';
		const col4 = row[4]?.trim() ?? '';

		// Check for special events
		const eventMatch = EVENTS[col2];

		let type = 'normal';
		let eventLabel: string | null = null;
		let isClosed = false;
		const assignees: string[] = [];

		if (eventMatch) {
			type = eventMatch.type;
			eventLabel = eventMatch.label;
			isClosed = eventMatch.closed;
			if (eventMatch.closed) closedCount++;
			else eventCount++;
		} else if (!col2 && !col3 && !col4) {
			// No assignments → closed (vacances scolaires or été)
			isClosed = true;
			eventLabel = 'Vacances';
			closedCount++;
		} else {
			// Normal slot with assignments
			if (col2 && memberMap.has(col2)) assignees.push(col2);
			if (col3 && memberMap.has(col3)) assignees.push(col3);
			if (col4 && memberMap.has(col4)) assignees.push(col4);
		}

		// Check for event note in col6 (e.g., "ballades des habitants")
		const col6 = row[6]?.trim() ?? '';
		if (!eventLabel && col6 && !col6.startsWith('Sécheron') && !col6.startsWith('Pâquis')) {
			// It's a note/event from the comments column
			// Don't override type, just add as event label if meaningful
		}

		const slotId = ulid();
		await db.insert(saturdaySlots).values({
			id: slotId,
			seasonId,
			date,
			type,
			eventLabel,
			requiredCount: isClosed ? null : 3,
			isClosed
		});
		slotCount++;

		// Create assignments
		for (const name of assignees) {
			const memberId = memberMap.get(name);
			if (!memberId) continue;
			await db.insert(assignments).values({
				id: ulid(),
				slotId,
				memberId
			});
			assignmentCount++;
		}
	}

	console.log(`✓ ${slotCount} samedis créés (${closedCount} fermés, ${eventCount} événements)`);
	console.log(`✓ ${assignmentCount} assignations créées`);
	console.log('\nDone!');
}

seed().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
