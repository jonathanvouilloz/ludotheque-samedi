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

// ── Themes ───────────────────────────────────────────────────────────
export const themes = sqliteTable('themes', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Theme Items ──────────────────────────────────────────────────────
export const themeItems = sqliteTable('theme_items', {
	id: text('id').primaryKey(),
	themeId: text('theme_id')
		.notNull()
		.references(() => themes.id),
	name: text('name').notNull(),
	quantity: integer('quantity').notNull().default(1),
	isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Theme Periods ────────────────────────────────────────────────────
export const themePeriods = sqliteTable('theme_periods', {
	id: text('id').primaryKey(),
	themeId: text('theme_id')
		.notNull()
		.references(() => themes.id),
	startedBy: text('started_by').references(() => members.id),
	closedAt: text('closed_at'), // null = période active
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Checkups ─────────────────────────────────────────────────────────
export const checkups = sqliteTable('checkups', {
	id: text('id').primaryKey(),
	themePeriodId: text('theme_period_id')
		.notNull()
		.references(() => themePeriods.id),
	doneBy: text('done_by').references(() => members.id),
	note: text('note'),
	completedAt: text('completed_at'), // null = en cours
	createdAt: text('created_at')
		.notNull()
		.default(sql`(CURRENT_TIMESTAMP)`)
});

// ── Checkup Entries ──────────────────────────────────────────────────
export const checkupEntries = sqliteTable('checkup_entries', {
	id: text('id').primaryKey(),
	checkupId: text('checkup_id')
		.notNull()
		.references(() => checkups.id),
	themeItemId: text('theme_item_id').references(() => themeItems.id), // null si suggestion
	status: text('status').notNull(), // 'present' | 'broken' | 'missing' | 'needs_more' | 'suggestion'
	suggestedName: text('suggested_name'), // non-null si status='suggestion'
	note: text('note'),
	resolvedAt: text('resolved_at'),
	resolvedBy: text('resolved_by').references(() => members.id),
	resolutionType: text('resolution_type') // 'repaired' | 'replaced' | 'found'
});

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
export type Absence = typeof absences.$inferSelect;
export type InsertAbsence = typeof absences.$inferInsert;
export type AbsenceType = 'vacation' | 'leave' | 'training' | 'unavailable';
export type AbsenceStatus = 'pending' | 'approved' | 'rejected';
export type Theme = typeof themes.$inferSelect;
export type InsertTheme = typeof themes.$inferInsert;
export type ThemeItem = typeof themeItems.$inferSelect;
export type InsertThemeItem = typeof themeItems.$inferInsert;
export type ThemePeriod = typeof themePeriods.$inferSelect;
export type InsertThemePeriod = typeof themePeriods.$inferInsert;
export type Checkup = typeof checkups.$inferSelect;
export type InsertCheckup = typeof checkups.$inferInsert;
export type CheckupEntry = typeof checkupEntries.$inferSelect;
export type InsertCheckupEntry = typeof checkupEntries.$inferInsert;
export type CheckupEntryStatus = 'present' | 'broken' | 'missing' | 'needs_more' | 'suggestion';
export type ResolutionType = 'repaired' | 'replaced' | 'found';
