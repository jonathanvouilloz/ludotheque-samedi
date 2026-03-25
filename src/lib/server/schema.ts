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
