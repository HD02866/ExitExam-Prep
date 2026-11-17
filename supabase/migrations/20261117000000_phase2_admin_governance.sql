-- ==============================================================================
-- EXITEXAM PREP — Phase 2: Admin Governance, Activity Logs & Academic Integrity
-- ==============================================================================

-- 1. TABLE: admin_activity_logs (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    admin_email TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for log querying and filtration
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.admin_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.admin_activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);

-- Enable RLS on activity logs
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view activity logs
CREATE POLICY "Admins can view activity logs"
    ON public.admin_activity_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Only Admins or Security Definer functions can insert activity logs
CREATE POLICY "Admins can insert activity logs"
    ON public.admin_activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Notice: NO UPDATE or DELETE policies are granted. Logs are strictly immutable.

-- 2. CASE-INSENSITIVE UNIQUE CONSTRAINTS FOR ACADEMIC INTEGRITY
-- Prevent duplicate department names (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_name_lower 
    ON public.departments (LOWER(TRIM(name)));

-- Prevent duplicate department codes (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_code_upper 
    ON public.departments (UPPER(TRIM(code)));

-- Prevent duplicate course codes within a department (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_dept_code_upper 
    ON public.courses (department_id, UPPER(TRIM(code)));

-- 3. HELPER FUNCTION: Check if a department is safe to delete
CREATE OR REPLACE FUNCTION public.check_department_dependencies(dept_id UUID)
RETURNS TABLE (
    course_count BIGINT,
    instructor_count BIGINT,
    student_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.courses WHERE department_id = dept_id) AS course_count,
        (SELECT COUNT(*) FROM public.instructor_departments WHERE department_id = dept_id) AS instructor_count,
        (SELECT COUNT(*) FROM public.profiles WHERE department_id = dept_id) AS student_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
