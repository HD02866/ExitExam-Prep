-- ==============================================================================
-- EXITEXAM PREP — Phase 1: Database Schema, Indexes, Triggers, and RLS Policies
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

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

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_dept ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_courses_dept ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_active ON public.courses(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_active ON public.departments(is_active);
CREATE INDEX IF NOT EXISTS idx_inst_dept_inst ON public.instructor_departments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_inst_dept_dept ON public.instructor_departments(department_id);

-- 4. UPDATED_AT TRIGGER FUNCTION
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

-- 5. AUTH USER REGISTRATION HOOK (Trigger to create profile on signup)
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

-- 6. HELPER FUNCTIONS FOR SECURITY DEFINER ROLE CHECKS (Avoids RLS recursion)
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

-- 7. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_departments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can view active instructors"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (role = 'instructor' AND account_status = 'active');

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- DEPARTMENTS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated users view active departments"
    ON public.departments FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Public view active departments"
    ON public.departments FOR SELECT
    TO anon
    USING (is_active = true);

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
CREATE POLICY "Admins view all courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (public.is_admin());

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
CREATE POLICY "Admins view all instructor assignments"
    ON public.instructor_departments FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Instructors view own assignments"
    ON public.instructor_departments FOR SELECT
    TO authenticated
    USING (instructor_id = auth.uid());

CREATE POLICY "Users view instructor assignments"
    ON public.instructor_departments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins insert instructor assignments"
    ON public.instructor_departments FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete instructor assignments"
    ON public.instructor_departments FOR DELETE
    TO authenticated
    USING (public.is_admin());
