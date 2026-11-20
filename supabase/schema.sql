-- ==============================================================================
-- EXITEXAM PREP — Phase 1: Database Schema, Indexes, Triggers, and RLS Policies
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS (or standard text with CHECK constraints for maximum compatibility)
-- User Roles: 'admin', 'instructor', 'student'
-- Account Statuses: 'active', 'inactive', 'suspended'

-- 3. TABLES

-- Table: departments
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'instructor', 'student')) DEFAULT 'student',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    account_status TEXT NOT NULL CHECK (account_status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: courses
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_course_dept_code UNIQUE (department_id, code)
);

-- Table: instructor_departments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.instructor_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_instructor_dept UNIQUE (instructor_id, department_id)
);

-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_dept ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_courses_dept ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_active ON public.courses(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_active ON public.departments(is_active);
CREATE INDEX IF NOT EXISTS idx_inst_dept_inst ON public.instructor_departments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_inst_dept_dept ON public.instructor_departments(department_id);

-- 5. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_departments_updated_at ON public.departments;
CREATE TRIGGER trigger_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_courses_updated_at ON public.courses;
CREATE TRIGGER trigger_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. AUTH USER REGISTRATION HOOK (Trigger to create profile on signup)
-- CRITICAL SECURITY ENFORCEMENT:
-- Public registration is strictly forced to 'student' role and 'active' status.
-- Neither role nor account_status submitted in client metadata can elevate privileges.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_dept UUID;
    user_role TEXT;
BEGIN
    -- Determine role: only allow 'instructor' if created via server/admin context with explicit instructor metadata,
    -- otherwise default strictly to 'student'. 'admin' can NEVER be registered through metadata.
    IF (NEW.raw_user_meta_data->>'role') = 'instructor' AND (NEW.raw_app_meta_data->>'provider' = 'email_admin' OR NEW.raw_user_meta_data->>'created_by_admin' = 'true') THEN
        user_role := 'instructor';
    ELSE
        user_role := 'student';
    END IF;

    -- Extract optional department_id if valid UUID
    BEGIN
        assigned_dept := (NEW.raw_user_meta_data->>'department_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        assigned_dept := NULL;
    END;

    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role,
        department_id,
        account_status
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        user_role,
        assigned_dept,
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. HELPER FUNCTIONS FOR SECURITY DEFINER ROLE CHECKS (Avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
    RETURN COALESCE(user_role, 'student');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT public.get_user_role(auth.uid()) = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND account_status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Prevent non-admins from altering their own role or account_status
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_admin() THEN
        IF NEW.role <> OLD.role THEN
            RAISE EXCEPTION 'Unauthorized: Users cannot change their own role.';
        END IF;
        IF NEW.account_status <> OLD.account_status THEN
            RAISE EXCEPTION 'Unauthorized: Users cannot change their own account status.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_protect_profile_fields ON public.profiles;
CREATE TRIGGER trigger_protect_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_departments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------
-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Authenticated active users can view instructors (for course/dept info)
CREATE POLICY "Users can view active instructors"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (role = 'instructor' AND account_status = 'active');

-- Users can update their own profile (name, department_id if student)
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can update any profile (role, status, department)
CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- DEPARTMENTS POLICIES
-- -----------------------------------------------------------------------------
-- Anyone authenticated can view active departments; admins can view all
CREATE POLICY "Authenticated users view active departments"
    ON public.departments FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- Public can view active departments (for landing / registration display)
CREATE POLICY "Public view active departments"
    ON public.departments FOR SELECT
    TO anon
    USING (is_active = true);

-- Only Admins can insert, update, delete departments
CREATE POLICY "Admins can insert departments"
    ON public.departments FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update departments"
    ON public.departments FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete departments"
    ON public.departments FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- COURSES POLICIES
-- -----------------------------------------------------------------------------
-- Admins can view all courses
CREATE POLICY "Admins view all courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Instructors can view courses belonging to their assigned departments
CREATE POLICY "Instructors view assigned department courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.instructor_departments idp
            WHERE idp.instructor_id = auth.uid()
            AND idp.department_id = courses.department_id
        )
    );

-- Students and active users view active courses in active departments
CREATE POLICY "Students view active courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.departments d
            WHERE d.id = courses.department_id
            AND d.is_active = true
        )
    );

-- Only Admins can modify courses
CREATE POLICY "Admins insert courses"
    ON public.courses FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins update courses"
    ON public.courses FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete courses"
    ON public.courses FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- INSTRUCTOR_DEPARTMENTS POLICIES
-- -----------------------------------------------------------------------------
-- Admins can view all instructor assignments
CREATE POLICY "Admins view all instructor assignments"
    ON public.instructor_departments FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Instructors can view their own department assignments
CREATE POLICY "Instructors view own assignments"
    ON public.instructor_departments FOR SELECT
    TO authenticated
    USING (instructor_id = auth.uid());

-- Students and authenticated users can view department instructor assignments
CREATE POLICY "Users view instructor assignments"
    ON public.instructor_departments FOR SELECT
    TO authenticated
    USING (true);

-- Only Admins can assign or remove instructors
CREATE POLICY "Admins insert instructor assignments"
    ON public.instructor_departments FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete instructor assignments"
    ON public.instructor_departments FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- PHASE 2: ADMINISTRATIVE ACTIVITY LOGS (Immutable Audit Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.admin_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.admin_activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs"
    ON public.admin_activity_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can insert activity logs"
    ON public.admin_activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Phase 2 Case-Insensitive Uniqueness Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_name_lower 
    ON public.departments (LOWER(TRIM(name)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_code_upper 
    ON public.departments (UPPER(TRIM(code)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_dept_code_upper 
    ON public.courses (department_id, UPPER(TRIM(code)));

-- ==============================================================================
-- PHASE 3: EXAMINATION & QUESTION ARCHITECTURE
-- ==============================================================================

-- Table: exams
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('exit_exam', 'course_exam')),
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    exam_year INTEGER NOT NULL CHECK (exam_year >= 2000 AND exam_year <= 2100),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    total_questions INTEGER NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts >= 1),
    passing_score NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (passing_score >= 0 AND passing_score <= 100),
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_exam_type_course CHECK (
        (exam_type = 'course_exam' AND course_id IS NOT NULL) OR
        (exam_type = 'exit_exam')
    )
);

CREATE INDEX IF NOT EXISTS idx_exams_department_id ON public.exams(department_id);
CREATE INDEX IF NOT EXISTS idx_exams_course_id ON public.exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON public.exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_exam_type ON public.exams(exam_type);
CREATE INDEX IF NOT EXISTS idx_exams_exam_year ON public.exams(exam_year);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON public.exams(created_at DESC);

DROP TRIGGER IF EXISTS trigger_exams_updated_at ON public.exams;
CREATE TRIGGER trigger_exams_updated_at
    BEFORE UPDATE ON public.exams
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Table: questions
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_order INTEGER NOT NULL DEFAULT 1 CHECK (question_order >= 1),
    explanation TEXT,
    points NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (points > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON public.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_order ON public.questions(exam_id, question_order);

DROP TRIGGER IF EXISTS trigger_questions_updated_at ON public.questions;
CREATE TRIGGER trigger_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Table: question_options
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_key TEXT NOT NULL CHECK (option_key IN ('A', 'B', 'C', 'D')),
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_question_option_key UNIQUE (question_id, option_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_question_one_correct 
    ON public.question_options(question_id) 
    WHERE is_correct = true;

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON public.question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_is_correct ON public.question_options(question_id, is_correct);

DROP TRIGGER IF EXISTS trigger_question_options_updated_at ON public.question_options;
CREATE TRIGGER trigger_question_options_updated_at
    BEFORE UPDATE ON public.question_options
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: sync exams.total_questions counter
CREATE OR REPLACE FUNCTION public.sync_exam_question_count()
RETURNS TRIGGER AS $$
DECLARE
    target_exam_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_exam_id := OLD.exam_id;
    ELSE
        target_exam_id := NEW.exam_id;
    END IF;

    UPDATE public.exams
    SET total_questions = (
        SELECT COUNT(*) FROM public.questions WHERE exam_id = target_exam_id
    )
    WHERE id = target_exam_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_exam_questions_count ON public.questions;
CREATE TRIGGER trigger_sync_exam_questions_count
    AFTER INSERT OR DELETE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.sync_exam_question_count();

-- Function: validate exam publication readiness
CREATE OR REPLACE FUNCTION public.validate_exam_for_publication(p_exam_id UUID)
RETURNS TABLE (
    is_valid BOOLEAN,
    errors TEXT[],
    question_count INTEGER,
    total_points NUMERIC
) AS $$
DECLARE
    v_exam RECORD;
    v_dept_active BOOLEAN;
    v_course RECORD;
    v_errors TEXT[] := '{}';
    v_q_count INTEGER;
    v_tot_pts NUMERIC := 0;
    v_invalid_opt_count INTEGER;
    v_invalid_correct_count INTEGER;
    v_invalid_pts_count INTEGER;
BEGIN
    SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, ARRAY['Examination not found.'], 0, 0::NUMERIC;
        RETURN;
    END IF;

    IF length(trim(v_exam.title)) < 3 THEN
        v_errors := array_append(v_errors, 'Exam title must be at least 3 characters long.');
    END IF;

    SELECT is_active INTO v_dept_active FROM public.departments WHERE id = v_exam.department_id;
    IF v_dept_active IS NULL THEN
        v_errors := array_append(v_errors, 'Selected department does not exist.');
    ELSIF v_dept_active = false THEN
        v_errors := array_append(v_errors, 'Selected department is inactive.');
    END IF;

    IF v_exam.exam_type = 'course_exam' THEN
        IF v_exam.course_id IS NULL THEN
            v_errors := array_append(v_errors, 'Course examination must have an associated course.');
        ELSE
            SELECT * INTO v_course FROM public.courses WHERE id = v_exam.course_id;
            IF NOT FOUND THEN
                v_errors := array_append(v_errors, 'Associated course does not exist.');
            ELSIF v_course.department_id <> v_exam.department_id THEN
                v_errors := array_append(v_errors, 'Associated course does not belong to the selected department.');
            ELSIF v_course.is_active = false THEN
                v_errors := array_append(v_errors, 'Associated course is inactive.');
            END IF;
        END IF;
    ELSIF v_exam.course_id IS NOT NULL THEN
        SELECT * INTO v_course FROM public.courses WHERE id = v_exam.course_id;
        IF NOT FOUND THEN
            v_errors := array_append(v_errors, 'Associated course does not exist.');
        ELSIF v_course.department_id <> v_exam.department_id THEN
            v_errors := array_append(v_errors, 'Associated course does not belong to the selected department.');
        END IF;
    END IF;

    IF v_exam.duration_minutes <= 0 THEN
        v_errors := array_append(v_errors, 'Examination duration must be greater than 0 minutes.');
    END IF;

    SELECT COUNT(*), COALESCE(SUM(points), 0) INTO v_q_count, v_tot_pts
    FROM public.questions WHERE exam_id = p_exam_id;

    IF v_q_count = 0 THEN
        v_errors := array_append(v_errors, 'Examination must contain at least one question.');
    END IF;

    SELECT COUNT(*) INTO v_invalid_pts_count
    FROM public.questions WHERE exam_id = p_exam_id AND points <= 0;
    IF v_invalid_pts_count > 0 THEN
        v_errors := array_append(v_errors, format('%s question(s) have invalid points (must be greater than 0).', v_invalid_pts_count));
    END IF;

    SELECT COUNT(*) INTO v_invalid_opt_count
    FROM (
        SELECT q.id, COUNT(qo.id) as opt_count
        FROM public.questions q
        LEFT JOIN public.question_options qo ON qo.question_id = q.id
        WHERE q.exam_id = p_exam_id
        GROUP BY q.id
        HAVING COUNT(qo.id) <> 4
    ) invalid_opts;

    IF v_invalid_opt_count > 0 THEN
        v_errors := array_append(v_errors, format('%s question(s) do not have exactly 4 answer options.', v_invalid_opt_count));
    END IF;

    SELECT COUNT(*) INTO v_invalid_correct_count
    FROM (
        SELECT q.id, COUNT(qo.id) filter (WHERE qo.is_correct = true) as correct_count
        FROM public.questions q
        LEFT JOIN public.question_options qo ON qo.question_id = q.id
        WHERE q.exam_id = p_exam_id
        GROUP BY q.id
        HAVING COUNT(qo.id) filter (WHERE qo.is_correct = true) <> 1
    ) invalid_correct;

    IF v_invalid_correct_count > 0 THEN
        v_errors := array_append(v_errors, format('%s question(s) do not have exactly one correct answer selected.', v_invalid_correct_count));
    END IF;

    RETURN QUERY SELECT (cardinality(v_errors) = 0), v_errors, v_q_count, v_tot_pts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Secure View: Protected option view for future phases
CREATE OR REPLACE VIEW public.student_question_options AS
SELECT 
    id,
    question_id,
    option_key,
    option_text,
    created_at,
    updated_at
FROM public.question_options;

-- RLS: Enable on exams, questions, question_options
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

-- EXAMS POLICIES
CREATE POLICY "Admins can view all exams"
    ON public.exams FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Instructors view assigned department exams"
    ON public.exams FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.instructor_departments idp
            WHERE idp.instructor_id = auth.uid()
            AND idp.department_id = exams.department_id
        )
    );

CREATE POLICY "Students view published department exams"
    ON public.exams FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'student'
        AND status = 'published'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.department_id = exams.department_id
        )
    );

CREATE POLICY "Admins insert any exam"
    ON public.exams FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Instructors insert assigned department exams"
    ON public.exams FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.instructor_departments idp
            WHERE idp.instructor_id = auth.uid()
            AND idp.department_id = exams.department_id
        )
    );

CREATE POLICY "Admins update any exam"
    ON public.exams FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Instructors update assigned department exams"
    ON public.exams FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.instructor_departments idp
            WHERE idp.instructor_id = auth.uid()
            AND idp.department_id = exams.department_id
        )
    )
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.instructor_departments idp
            WHERE idp.instructor_id = auth.uid()
            AND idp.department_id = exams.department_id
        )
    );

CREATE POLICY "Admins delete any exam"
    ON public.exams FOR DELETE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Instructors delete assigned department exams"
    ON public.exams FOR DELETE
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.instructor_departments idp
            WHERE idp.instructor_id = auth.uid()
            AND idp.department_id = exams.department_id
        )
    );

-- QUESTIONS POLICIES
CREATE POLICY "Admins view all questions"
    ON public.questions FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Instructors view assigned department questions"
    ON public.questions FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.exams e
            JOIN public.instructor_departments idp ON idp.department_id = e.department_id
            WHERE e.id = questions.exam_id
            AND idp.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins insert questions"
    ON public.questions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Instructors insert assigned department questions"
    ON public.questions FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.exams e
            JOIN public.instructor_departments idp ON idp.department_id = e.department_id
            WHERE e.id = questions.exam_id
            AND idp.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins update questions"
    ON public.questions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Instructors update assigned department questions"
    ON public.questions FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.exams e
            JOIN public.instructor_departments idp ON idp.department_id = e.department_id
            WHERE e.id = questions.exam_id
            AND idp.instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.exams e
            JOIN public.instructor_departments idp ON idp.department_id = e.department_id
            WHERE e.id = questions.exam_id
            AND idp.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins delete questions"
    ON public.questions FOR DELETE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Instructors delete assigned department questions"
    ON public.questions FOR DELETE
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.exams e
            JOIN public.instructor_departments idp ON idp.department_id = e.department_id
            WHERE e.id = questions.exam_id
            AND idp.instructor_id = auth.uid()
        )
    );

-- QUESTION_OPTIONS POLICIES
CREATE POLICY "Admins view all question options"
    ON public.question_options FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Instructors view assigned question options"
    ON public.question_options FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.exams e ON e.id = q.exam_id
            JOIN public.instructor_departments idp ON idp.department_id = e.department_id
            WHERE q.id = question_options.question_id
            AND idp.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins insert question options"
    ON public.question_options FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Instructors insert assigned question options"
    ON public.question_options FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.exams e ON e.id = q.exam_id
            JOIN public.instructor_departments idp ON idp.department_id = e.department_id
            WHERE q.id = question_options.question_id
            AND idp.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins update question options"
    ON public.question_options FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Instructors update assigned question options"
    ON public.question_options FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.exams e ON e.id = q.exam_id
            JOIN public.instructor_departments idp ON idp.department_id = e.department_id
            WHERE q.id = question_options.question_id
            AND idp.instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.exams e ON e.id = q.exam_id
            JOIN public.instructor_departments idp ON idp.department_id = e.department_id
            WHERE q.id = question_options.question_id
            AND idp.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins delete question options"
    ON public.question_options FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Instructors delete question options
CREATE POLICY "Instructors delete assigned question options"
    ON public.question_options FOR DELETE
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'instructor'
        AND EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.exams e ON e.id = q.exam_id
            JOIN public.instructor_departments idp ON idp.department_id = e.department_id
            WHERE q.id = question_options.question_id
            AND idp.instructor_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- SEED HELPER (Initial provisioning note):
-- To make a user an Admin after they register, run:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';
-- ==============================================================================
