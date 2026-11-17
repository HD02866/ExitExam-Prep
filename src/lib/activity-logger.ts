import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

export interface LogAdminActivityParams {
  adminId: string;
  adminEmail: string;
  adminName: string;
  actionType: string;
  entityType: 'user' | 'department' | 'course' | 'instructor_assignment';
  entityId?: string | null;
  details?: Record<string, unknown>;
}

// Keys that must NEVER be persisted in activity logs
const FORBIDDEN_DETAIL_KEYS = new Set([
  'password',
  'token',
  'secret',
  'key',
  'service_role_key',
  'accessToken',
  'refreshToken',
  'hash',
]);

function sanitizeDetails(details?: Record<string, unknown>): Json {
  if (!details) return {};

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = Array.from(FORBIDDEN_DETAIL_KEYS).some((forbidden) =>
      lowerKey.includes(forbidden)
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized as Json;
}

export async function logAdminActivity(params: LogAdminActivityParams): Promise<void> {
  try {
    const adminClient = createAdminClient();

    const sanitizedDetails = sanitizeDetails(params.details);

    await adminClient.from('admin_activity_logs').insert({
      admin_id: params.adminId,
      admin_email: params.adminEmail,
      admin_name: params.adminName,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      details: sanitizedDetails,
    });
  } catch (err) {
    // Activity logging should not crash the primary transaction, but log an error to server console
    console.error('Failed to write admin activity log:', err);
  }
}
