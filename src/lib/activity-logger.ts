import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

export interface LogAdminActivityParams {
  adminId: string | null;
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
  'authorization',
  'apikey',
]);

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  const sanitizedObj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const lowerKey = k.toLowerCase();
    const isSensitive = Array.from(FORBIDDEN_DETAIL_KEYS).some((forbidden) =>
      lowerKey.includes(forbidden)
    );

    if (isSensitive) {
      sanitizedObj[k] = '[REDACTED]';
    } else {
      sanitizedObj[k] = sanitizeValue(v);
    }
  }
  return sanitizedObj;
}

export function sanitizeDetails(details?: Record<string, unknown>): Json {
  if (!details) return {};
  return sanitizeValue(details) as Json;
}

export async function logAdminActivity(params: LogAdminActivityParams): Promise<void> {
  const adminClient = createAdminClient();
  const sanitizedDetails = sanitizeDetails(params.details);

  const { error } = await adminClient.from('admin_activity_logs').insert({
    admin_id: params.adminId,
    admin_email: params.adminEmail,
    admin_name: params.adminName,
    action_type: params.actionType,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    details: sanitizedDetails,
  });

  if (error) {
    const errorMsg = `[AUDIT ERROR] Mandatory audit logging failed: ${error.message} (action: ${params.actionType}, entity: ${params.entityType})`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}
