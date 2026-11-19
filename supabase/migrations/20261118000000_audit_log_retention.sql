-- ==============================================================================
-- EXITEXAM PREP — Phase 2 Security Audit: Audit Log Retention Hardening
-- ==============================================================================
-- 1. Ensure admin_id is nullable so deleting an administrator preserves logs
ALTER TABLE public.admin_activity_logs 
    ALTER COLUMN admin_id DROP NOT NULL;

-- 2. Drop the old cascading foreign key constraint if present
ALTER TABLE public.admin_activity_logs 
    DROP CONSTRAINT IF EXISTS admin_activity_logs_admin_id_fkey;

-- 3. Recreate foreign key with ON DELETE SET NULL to preserve audit trail
ALTER TABLE public.admin_activity_logs 
    ADD CONSTRAINT admin_activity_logs_admin_id_fkey 
    FOREIGN KEY (admin_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- 4. Comment on table for documentation and governance compliance
COMMENT ON COLUMN public.admin_activity_logs.admin_id IS 
    'Reference to public.profiles(id). Nullified via ON DELETE SET NULL if admin user is deleted, while admin_name and admin_email preserve immutable snapshot of actor.';
