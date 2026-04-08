import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ── Members ──────────────────────────────────────────────────────────
export const members = sqliteTable('members', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	label: text('label'),
	isPermanent: integer('is_permanent', { mode: 'boolean' }).notNull().default(false),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Seasons ──────────────────────────────────────────────────────────
export const seasons = sqliteTable('seasons', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	startDate: text('start_date').notNull(),
	endDate: text('end_date').notNull(),
	defaultSlots: integer('default_slots').notNull().default(2),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Saturday Slots ───────────────────────────────────────────────────
export const saturdaySlots = sqliteTable('saturday_slots', {
	id: text('id').primaryKey(),
	seasonId: text('season_id')
		.notNull()
		.references(() => seasons.id),
	date: text('date').notNull(),
	type: text('type').notNull().default('normal'),
	eventLabel: text('event_label'),
	requiredCount: integer('required_count'),
	isClosed: integer('is_closed', { mode: 'boolean' }).notNull().default(false)
});

// ── Assignments ──────────────────────────────────────────────────────
export const assignments = sqliteTable(
	'assignments',
	{
		id: text('id').primaryKey(),
		slotId: text('slot_id')
			.notNull()
			.references(() => saturdaySlots.id),
		memberId: text('member_id')
			.notNull()
			.references(() => members.id)
	},
	(table) => [uniqueIndex('unique_slot_member').on(table.slotId, table.memberId)]
);

// ── Game Wishes ──────────────────────────────────────────────────────
export const gameWishes = sqliteTable('game_wishes', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	link: text('link'),
	price: real('price'),
	addedBy: text('added_by').references(() => members.id),
	isPurchased: integer('is_purchased', { mode: 'boolean' }).notNull().default(false),
	purchasedBy: text('purchased_by').references(() => members.id),
	purchasedAt: text('purchased_at'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Supply Needs ─────────────────────────────────────────────────────
export const supplyNeeds = sqliteTable('supply_needs', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	link: text('link'),
	price: real('price'),
	category: text('category').notNull(),
	urgency: text('urgency').notNull().default('normal'),
	addedBy: text('added_by').references(() => members.id),
	isPurchased: integer('is_purchased', { mode: 'boolean' }).notNull().default(false),
	purchasedBy: text('purchased_by').references(() => members.id),
	purchasedAt: text('purchased_at'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Schools ──────────────────────────────────────────────────────────
export const schools = sqliteTable('schools', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	address: text('address'),
	contactName: text('contact_name'),
	contactEmail: text('contact_email'),
	phone: text('phone'),
	notes: text('notes'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── School Periods (vacances, fériés, ponts, journées spéciales) ─────
export const schoolPeriods = sqliteTable('school_periods', {
	id: text('id').primaryKey(),
	label: text('label').notNull(),
	type: text('type').notNull(), // 'vacation' | 'holiday' | 'pont' | 'special'
	startDate: text('start_date').notNull(),
	endDate: text('end_date').notNull(),
	isBlocking: integer('is_blocking', { mode: 'boolean' }).notNull().default(false),
	year: integer('year').notNull(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Absences (vacances, congés, formations, indispos) ───────────────
export const absences = sqliteTable('absences', {
	id: text('id').primaryKey(),
	memberId: text('member_id')
		.notNull()
		.references(() => members.id),
	type: text('type').notNull(), // 'vacation' | 'leave' | 'training' | 'unavailable'
	startDate: text('start_date').notNull(),
	endDate: text('end_date').notNull(),
	startTime: text('start_time'),
	endTime: text('end_time'),
	status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
	requestNote: text('request_note'),
	responseNote: text('response_note'),
	requestedBy: text('requested_by')
		.notNull()
		.references(() => members.id),
	respondedBy: text('responded_by').references(() => members.id),
	respondedAt: text('responded_at'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Proposals (lots de créneaux envoyés à une école) ────────────────
export const proposals = sqliteTable('proposals', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	schoolId: text('school_id')
		.notNull()
		.references(() => schools.id),
	token: text('token').notNull().unique(),
	status: text('status').notNull().default('draft'), // 'draft' | 'sent' | 'submitted' | 'confirmed' | 'expired'
	deadline: text('deadline').notNull(),
	message: text('message'),
	createdBy: text('created_by')
		.notNull()
		.references(() => members.id),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`),
	submittedAt: text('submitted_at'),
	confirmedAt: text('confirmed_at')
});

// ── Events (accueils + événements internes) ─────────────────────────
export const events = sqliteTable('events', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	kind: text('kind').notNull(), // 'accueil' | 'internal'
	schoolId: text('school_id').references(() => schools.id),
	proposalId: text('proposal_id').references(() => proposals.id, { onDelete: 'cascade' }),
	declined: integer('declined', { mode: 'boolean' }).notNull().default(false),
	classLabel: text('class_label'),
	contactName: text('contact_name'),
	contactEmail: text('contact_email'),
	ageRange: text('age_range'),
	childCount: integer('child_count'),
	date: text('date').notNull(),
	startTime: text('start_time').notNull(),
	endTime: text('end_time').notNull(),
	location: text('location'),
	status: text('status').notNull().default('draft'), // 'draft' | 'sent' | 'confirmed'
	recurrenceGroupId: text('recurrence_group_id'),
	notes: text('notes'),
	createdBy: text('created_by')
		.notNull()
		.references(() => members.id),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

export const eventAssignments = sqliteTable(
	'event_assignments',
	{
		id: text('id').primaryKey(),
		eventId: text('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		memberId: text('member_id')
			.notNull()
			.references(() => members.id)
	},
	(table) => [uniqueIndex('unique_event_member').on(table.eventId, table.memberId)]
);

// ── Activity Log ─────────────────────────────────────────────────────
export const activityLog = sqliteTable('activity_log', {
	id: text('id').primaryKey(),
	type: text('type').notNull(),
	description: text('description').notNull(),
	actorId: text('actor_id').references(() => members.id),
	metadata: text('metadata'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Inferred Types ───────────────────────────────────────────────────
export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;
export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;
export type SaturdaySlot = typeof saturdaySlots.$inferSelect;
export type InsertSaturdaySlot = typeof saturdaySlots.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;
export type GameWish = typeof gameWishes.$inferSelect;
export type InsertGameWish = typeof gameWishes.$inferInsert;
export type SupplyNeed = typeof supplyNeeds.$inferSelect;
export type InsertSupplyNeed = typeof supplyNeeds.$inferInsert;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type InsertActivityLogEntry = typeof activityLog.$inferInsert;
export type School = typeof schools.$inferSelect;
export type InsertSchool = typeof schools.$inferInsert;
export type SchoolPeriod = typeof schoolPeriods.$inferSelect;
export type InsertSchoolPeriod = typeof schoolPeriods.$inferInsert;

export type SchoolPeriodType = 'vacation' | 'holiday' | 'pont' | 'special';

export type Absence = typeof absences.$inferSelect;
export type InsertAbsence = typeof absences.$inferInsert;
export type AbsenceType = 'vacation' | 'leave' | 'training' | 'unavailable';
export type AbsenceStatus = 'pending' | 'approved' | 'rejected';

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type EventAssignment = typeof eventAssignments.$inferSelect;
export type InsertEventAssignment = typeof eventAssignments.$inferInsert;
export type EventKind = 'accueil' | 'internal';
export type EventStatus = 'draft' | 'sent' | 'confirmed';

export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = typeof proposals.$inferInsert;
export type ProposalStatus = 'draft' | 'sent' | 'submitted' | 'confirmed' | 'expired';
