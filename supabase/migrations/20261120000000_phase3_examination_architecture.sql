-- ==============================================================================
-- EXITEXAM PREP — Phase 3: Examination & Question Architecture Migration
-- ==============================================================================

-- 1. TABLE: exams
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

-- Indexes for exams
CREATE INDEX IF NOT EXISTS idx_exams_department_id ON public.exams(department_id);
CREATE INDEX IF NOT EXISTS idx_exams_course_id ON public.exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON public.exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_exam_type ON public.exams(exam_type);
CREATE INDEX IF NOT EXISTS idx_exams_exam_year ON public.exams(exam_year);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON public.exams(created_at DESC);

-- Trigger for exams updated_at
DROP TRIGGER IF EXISTS trigger_exams_updated_at ON public.exams;
CREATE TRIGGER trigger_exams_updated_at
    BEFORE UPDATE ON public.exams
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. TABLE: questions
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

-- Indexes for questions
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON public.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_order ON public.questions(exam_id, question_order);

-- Trigger for questions updated_at
DROP TRIGGER IF EXISTS trigger_questions_updated_at ON public.questions;
CREATE TRIGGER trigger_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. TABLE: question_options
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

-- Partial unique index: Guarantee at most one correct answer per question at DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_question_one_correct 
    ON public.question_options(question_id) 
    WHERE is_correct = true;

-- Indexes for question_options
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON public.question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_is_correct ON public.question_options(question_id, is_correct);

-- Trigger for question_options updated_at
DROP TRIGGER IF EXISTS trigger_question_options_updated_at ON public.question_options;
CREATE TRIGGER trigger_question_options_updated_at
    BEFORE UPDATE ON public.question_options
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. TRIGGER: Sync exams.total_questions counter
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

-- 5. FUNCTION: Validate exam publication readiness
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
    -- Fetch exam
    SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, ARRAY['Examination not found.'], 0, 0::NUMERIC;
        RETURN;
    END IF;

    -- Check title
    IF length(trim(v_exam.title)) < 3 THEN
        v_errors := array_append(v_errors, 'Exam title must be at least 3 characters long.');
    END IF;

    -- Check department existence & active status
    SELECT is_active INTO v_dept_active FROM public.departments WHERE id = v_exam.department_id;
    IF v_dept_active IS NULL THEN
        v_errors := array_append(v_errors, 'Selected department does not exist.');
    ELSIF v_dept_active = false THEN
        v_errors := array_append(v_errors, 'Selected department is inactive.');
    END IF;

    -- Check course if course_exam
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

    -- Check duration
    IF v_exam.duration_minutes <= 0 THEN
        v_errors := array_append(v_errors, 'Examination duration must be greater than 0 minutes.');
    END IF;

    -- Check questions count
    SELECT COUNT(*), COALESCE(SUM(points), 0) INTO v_q_count, v_tot_pts
    FROM public.questions WHERE exam_id = p_exam_id;

    IF v_q_count = 0 THEN
        v_errors := array_append(v_errors, 'Examination must contain at least one question.');
    END IF;

    -- Check question points
    SELECT COUNT(*) INTO v_invalid_pts_count
    FROM public.questions WHERE exam_id = p_exam_id AND points <= 0;
    IF v_invalid_pts_count > 0 THEN
        v_errors := array_append(v_errors, format('%s question(s) have invalid points (must be greater than 0).', v_invalid_pts_count));
    END IF;

    -- Check each question has exactly 4 options
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

    -- Check each question has exactly 1 correct answer
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

-- 6. SECURE VIEW: Architectural foresight protecting is_correct from students in future phases
CREATE OR REPLACE VIEW public.student_question_options AS
SELECT 
    id,
    question_id,
    option_key,
    option_text,
    created_at,
    updated_at
FROM public.question_options;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- EXAMS POLICIES
-- -----------------------------------------------------------------------------
-- Admins can view all exams
CREATE POLICY "Admins can view all exams"
    ON public.exams FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Instructors can view exams belonging to their assigned departments
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

-- Students can ONLY view published exams within their enrolled department
-- (Draft and Archived exams are strictly invisible to students)
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

-- Admins can insert exams for any department
CREATE POLICY "Admins insert any exam"
    ON public.exams FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Instructors can insert exams ONLY for their assigned departments
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

-- Admins can update any exam
CREATE POLICY "Admins update any exam"
    ON public.exams FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Instructors can update exams for their assigned departments
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

-- Admins can delete any exam
CREATE POLICY "Admins delete any exam"
    ON public.exams FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Instructors can delete exams in their assigned departments
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

-- -----------------------------------------------------------------------------
-- QUESTIONS POLICIES
-- -----------------------------------------------------------------------------
-- Admins can view all questions
CREATE POLICY "Admins view all questions"
    ON public.questions FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Instructors can view questions for exams in their assigned departments
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

-- NOTICE: Students have NO SELECT policy on questions table in Phase 3.
-- Students must not take examinations in this phase.

-- Admins can insert questions
CREATE POLICY "Admins insert questions"
    ON public.questions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Instructors can insert questions for exams in their assigned departments
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

-- Admins can update questions
CREATE POLICY "Admins update questions"
    ON public.questions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Instructors can update questions in their assigned departments
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

-- Admins can delete questions
CREATE POLICY "Admins delete questions"
    ON public.questions FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Instructors can delete questions in their assigned departments
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

-- -----------------------------------------------------------------------------
-- QUESTION_OPTIONS POLICIES (Protected Correct Answer Security)
-- -----------------------------------------------------------------------------
-- Admins can view all question options including is_correct
CREATE POLICY "Admins view all question options"
    ON public.question_options FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Instructors can view question options for questions in their assigned departments
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

-- Students have NO SELECT policy on question_options.
-- Students are prevented from directly viewing options with is_correct = true.

-- Admins can insert question options
CREATE POLICY "Admins insert question options"
    ON public.question_options FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Instructors can insert question options in assigned departments
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

-- Admins can update question options
CREATE POLICY "Admins update question options"
    ON public.question_options FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Instructors can update question options in assigned departments
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

-- Admins can delete question options
CREATE POLICY "Admins delete question options"
    ON public.question_options FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Instructors can delete question options in assigned departments
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
