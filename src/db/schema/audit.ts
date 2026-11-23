import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { profiles } from './academic';

/**
 * Administrative Activity Logs Table
 * Immutable audit trail recording administrative governance actions.
 * Preserves audit log rows when admin profiles are removed (ON DELETE SET NULL).
 */
export const adminActivityLogs = pgTable(
  'admin_activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    adminEmail: text('admin_email').notNull(),
    adminName: text('admin_name').notNull(),
    actionType: text('action_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    details: jsonb('details').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_activity_logs_admin_id').on(table.adminId),
    index('idx_activity_logs_action').on(table.actionType),
    index('idx_activity_logs_entity').on(table.entityType),
    index('idx_activity_logs_created_at').on(table.createdAt),
  ]
);

export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;
export type NewAdminActivityLog = typeof adminActivityLogs.$inferInsert;
