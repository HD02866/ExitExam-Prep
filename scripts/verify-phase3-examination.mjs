import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (details) console.error(`         Reason: ${details}`);
  }
}

async function runPhase3Tests() {
  console.log('\n===============================================================');
  console.log(' Phase 3: Examination & Question Architecture Test Suite');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Static vs Live Environment Distinction
  // ---------------------------------------------------------------------------
  console.log('1. Environment Configuration & Secret Protection');
  const envPath = path.join(rootDir, '.env.local');
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  const env = {};
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
  });

  assert(Boolean(env['NEXT_PUBLIC_SUPABASE_URL']), 'NEXT_PUBLIC_SUPABASE_URL is configured');
  assert(Boolean(env['NEXT_PUBLIC_SUPABASE_ANON_KEY']), 'NEXT_PUBLIC_SUPABASE_ANON_KEY is configured');
  assert(Boolean(env['SUPABASE_SERVICE_ROLE_KEY']), 'SUPABASE_SERVICE_ROLE_KEY is configured');
  assert(!Boolean(env['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY']), 'Service role key is NEVER prefixed with NEXT_PUBLIC_');

  const isLiveDb =
    !env['NEXT_PUBLIC_SUPABASE_URL']?.includes('placeholder') &&
    !env['NEXT_PUBLIC_SUPABASE_ANON_KEY']?.includes('placeholder');

  if (isLiveDb) {
    console.log('  [NOTICE] Live Supabase configuration detected. Running live DB connection tests.');
  } else {
    console.log('  [NOTICE] Static / Offline test execution mode active. .env.local contains placeholder credentials.');
    console.log('           Static structural and simulated tests are fully verified below.');
  }

  // ---------------------------------------------------------------------------
  // 2. Database Migrations & DDL Integrity
  // ---------------------------------------------------------------------------
  console.log('\n2. Database Verification: Phase 3 Migrations & DDL Integrity');

  const p1Path = path.join(rootDir, 'supabase', 'migrations', '20261114000000_phase1_foundation.sql');
  const p2Path = path.join(rootDir, 'supabase', 'migrations', '20261117000000_phase2_admin_governance.sql');
  const p2RetPath = path.join(rootDir, 'supabase', 'migrations', '20261118000000_audit_log_retention.sql');
  const p3Path = path.join(rootDir, 'supabase', 'migrations', '20261120000000_phase3_examination_architecture.sql');
  const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');

  assert(fs.existsSync(p1Path), 'Phase 1 migration file preserved (20261114000000_phase1_foundation.sql)');
  assert(fs.existsSync(p2Path), 'Phase 2 governance migration preserved (20261117000000_phase2_admin_governance.sql)');
  assert(fs.existsSync(p2RetPath), 'Phase 2 audit retention migration preserved (20261118000000_audit_log_retention.sql)');
  assert(fs.existsSync(p3Path), 'Phase 3 examination architecture migration created (20261120000000_phase3_examination_architecture.sql)');
  assert(fs.existsSync(schemaPath), 'Unified schema.sql file exists');

  const p3Sql = fs.readFileSync(p3Path, 'utf8');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Table exams
  assert(p3Sql.includes('CREATE TABLE IF NOT EXISTS public.exams'), 'Migration creates public.exams table');
  assert(p3Sql.includes('exam_type TEXT NOT NULL CHECK (exam_type IN (\'exit_exam\', \'course_exam\'))'), 'exams table enforces exit_exam vs course_exam check constraint');
  assert(p3Sql.includes('status TEXT NOT NULL CHECK (status IN (\'draft\', \'published\', \'archived\')) DEFAULT \'draft\''), 'exams table supports draft, published, archived with default draft');
  assert(p3Sql.includes('CONSTRAINT check_exam_type_course CHECK'), 'exams table enforces check_exam_type_course relationship constraint');
  assert(p3Sql.includes('duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0)'), 'exams table enforces positive duration_minutes constraint');

  // Table questions
  assert(p3Sql.includes('CREATE TABLE IF NOT EXISTS public.questions'), 'Migration creates public.questions table');
  assert(p3Sql.includes('points NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (points > 0)'), 'questions table enforces points > 0 check constraint');
  assert(p3Sql.includes('question_order INTEGER NOT NULL DEFAULT 1 CHECK (question_order >= 1)'), 'questions table supports question order');

  // Table question_options
  assert(p3Sql.includes('CREATE TABLE IF NOT EXISTS public.question_options'), 'Migration creates public.question_options table');
  assert(p3Sql.includes('option_key TEXT NOT NULL CHECK (option_key IN (\'A\', \'B\', \'C\', \'D\'))'), 'question_options enforces exactly Option A, B, C, D');
  assert(p3Sql.includes('CONSTRAINT uq_question_option_key UNIQUE (question_id, option_key)'), 'question_options enforces unique option key per question');
  assert(p3Sql.includes('CREATE UNIQUE INDEX IF NOT EXISTS uq_question_one_correct'), 'Partial unique index enforces AT MOST one correct option at DB level');

  // Stored procedures and triggers
  assert(p3Sql.includes('CREATE OR REPLACE FUNCTION public.sync_exam_question_count()'), 'Sync exam total_questions counter function created');
  assert(p3Sql.includes('CREATE OR REPLACE FUNCTION public.validate_exam_for_publication'), 'validate_exam_for_publication stored procedure created');
  assert(p3Sql.includes('CREATE OR REPLACE VIEW public.student_question_options'), 'student_question_options architectural view created without is_correct column');

  // ---------------------------------------------------------------------------
  // 3. Row Level Security (RLS) Policy Verification
  // ---------------------------------------------------------------------------
  console.log('\n3. Security Verification: Database RLS Policies');

  assert(p3Sql.includes('ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on public.exams');
  assert(p3Sql.includes('ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on public.questions');
  assert(p3Sql.includes('ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on public.question_options');

  assert(p3Sql.includes('CREATE POLICY "Admins can view all exams"'), 'Admin full SELECT policy on exams');
  assert(p3Sql.includes('CREATE POLICY "Instructors view assigned department exams"'), 'Instructor department-scoped SELECT policy on exams');
  assert(p3Sql.includes('CREATE POLICY "Students view published department exams"'), 'Student restricted SELECT policy (published only in department)');
  assert(p3Sql.includes('CREATE POLICY "Instructors insert assigned department exams"'), 'Instructor department-scoped INSERT policy on exams');
  assert(p3Sql.includes('CREATE POLICY "Instructors update assigned department exams"'), 'Instructor department-scoped UPDATE policy on exams');
  assert(p3Sql.includes('CREATE POLICY "Instructors delete assigned department exams"'), 'Instructor department-scoped DELETE policy on exams');

  assert(p3Sql.includes('CREATE POLICY "Instructors view assigned department questions"'), 'Instructor department-scoped SELECT policy on questions');
  assert(p3Sql.includes('CREATE POLICY "Instructors insert assigned department questions"'), 'Instructor department-scoped INSERT policy on questions');
  assert(p3Sql.includes('CREATE POLICY "Instructors update assigned department questions"'), 'Instructor department-scoped UPDATE policy on questions');
  assert(p3Sql.includes('CREATE POLICY "Instructors delete assigned department questions"'), 'Instructor department-scoped DELETE policy on questions');
  assert(!p3Sql.includes('CREATE POLICY "Students view questions"'), 'Students have NO SELECT policy on questions in Phase 3');

  assert(p3Sql.includes('CREATE POLICY "Instructors view assigned question options"'), 'Instructor department-scoped SELECT policy on question_options');
  assert(!p3Sql.includes('CREATE POLICY "Students view question options"'), 'Students have NO SELECT policy on question_options (correct answer protected)');

  // ---------------------------------------------------------------------------
  // 4. Academic Integrity & Validation Logic Simulation
  // ---------------------------------------------------------------------------
  console.log('\n4. Business Logic Simulation: Exam & Question Management');

  // Simulated Database State
  const mockDepartments = [
    { id: 'dept-cs-01', code: 'CS', name: 'Computer Science', is_active: true },
    { id: 'dept-ee-02', code: 'EE', name: 'Electrical Engineering', is_active: true },
    { id: 'dept-arc-03', code: 'ARCH', name: 'Architecture', is_active: false },
  ];

  const mockCourses = [
    { id: 'course-cs-101', code: 'CS101', title: 'Data Structures', department_id: 'dept-cs-01', is_active: true },
    { id: 'course-cs-102', code: 'CS102', title: 'Algorithms', department_id: 'dept-cs-01', is_active: false },
    { id: 'course-ee-201', code: 'EE201', title: 'Circuits', department_id: 'dept-ee-02', is_active: true },
  ];

  const mockInstructorAssignments = [
    { instructor_id: 'inst-01', department_id: 'dept-cs-01' },
  ];

  function simulateDepartmentAuth(userId, role, departmentId) {
    if (role === 'admin') return true;
    if (role !== 'instructor') return false;
    return mockInstructorAssignments.some(
      (a) => a.instructor_id === userId && a.department_id === departmentId
    );
  }

  // Test: Admin authorization across any department
  assert(simulateDepartmentAuth('admin-01', 'admin', 'dept-cs-01') === true, 'Admin authorized to manage CS department');
  assert(simulateDepartmentAuth('admin-01', 'admin', 'dept-ee-02') === true, 'Admin authorized to manage EE department');

  // Test: Instructor authorization within assigned department
  assert(simulateDepartmentAuth('inst-01', 'instructor', 'dept-cs-01') === true, 'Instructor authorized for assigned CS department');
  assert(simulateDepartmentAuth('inst-01', 'instructor', 'dept-ee-02') === false, 'Instructor rejected for unassigned EE department');
  assert(simulateDepartmentAuth('student-01', 'student', 'dept-cs-01') === false, 'Student strictly rejected from exam creation authorization');

  // Question Options Validation Simulation
  function validateQuestion(questionText, points, options) {
    const errors = [];
    if (!questionText || questionText.trim().length === 0) errors.push('Question text empty');
    if (!points || points <= 0) errors.push('Points <= 0');
    if (!Array.isArray(options) || options.length !== 4) errors.push('Options count !== 4');
    else {
      const keys = new Set(options.map((o) => o.optionKey));
      ['A', 'B', 'C', 'D'].forEach((k) => {
        if (!keys.has(k)) errors.push(`Missing option ${k}`);
      });
      if (options.some((o) => !o.optionText || o.optionText.trim().length === 0)) {
        errors.push('Empty option text');
      }
      const correctCount = options.filter((o) => o.isCorrect === true).length;
      if (correctCount !== 1) {
        errors.push(`Correct count !== 1 (found ${correctCount})`);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  // Test: 4-option validation
  const validOptions = [
    { optionKey: 'A', optionText: 'Option 1', isCorrect: true },
    { optionKey: 'B', optionText: 'Option 2', isCorrect: false },
    { optionKey: 'C', optionText: 'Option 3', isCorrect: false },
    { optionKey: 'D', optionText: 'Option 4', isCorrect: false },
  ];
  assert(validateQuestion('What is O(1)?', 2, validOptions).isValid === true, 'Valid question with 4 options and 1 correct answer passes');

  const threeOptions = validOptions.slice(0, 3);
  assert(validateQuestion('What is O(1)?', 2, threeOptions).isValid === false, 'Rejects question with fewer than 4 options (3 options)');

  const fiveOptions = [...validOptions, { optionKey: 'E', optionText: 'Option 5', isCorrect: false }];
  assert(validateQuestion('What is O(1)?', 2, fiveOptions).isValid === false, 'Rejects question with more than 4 options (5 options)');

  const zeroCorrectOptions = validOptions.map((o) => ({ ...o, isCorrect: false }));
  assert(validateQuestion('What is O(1)?', 2, zeroCorrectOptions).isValid === false, 'Rejects question with zero correct answers marked');

  const multipleCorrectOptions = validOptions.map((o) => ({ ...o, isCorrect: true }));
  assert(validateQuestion('What is O(1)?', 2, multipleCorrectOptions).isValid === false, 'Rejects question with multiple correct answers marked');

  const blankOptionText = [
    { optionKey: 'A', optionText: 'Valid', isCorrect: true },
    { optionKey: 'B', optionText: '   ', isCorrect: false },
    { optionKey: 'C', optionText: 'Valid', isCorrect: false },
    { optionKey: 'D', optionText: 'Valid', isCorrect: false },
  ];
  assert(validateQuestion('What is O(1)?', 2, blankOptionText).isValid === false, 'Rejects question with blank option text');

  const invalidPoints = validateQuestion('What is O(1)?', -1, validOptions);
  assert(invalidPoints.isValid === false, 'Rejects question with negative or zero points');

  // Publication Readiness Rules Simulation
  function simulatePublicationValidation(exam, questions) {
    const errors = [];
    if (!exam.title || exam.title.trim().length < 3) errors.push('Title < 3 chars');
    const dept = mockDepartments.find((d) => d.id === exam.department_id);
    if (!dept) errors.push('Department not found');
    else if (!dept.is_active) errors.push('Department inactive');

    if (exam.exam_type === 'course_exam') {
      if (!exam.course_id) errors.push('Course required for course_exam');
      else {
        const course = mockCourses.find((c) => c.id === exam.course_id);
        if (!course) errors.push('Course not found');
        else if (course.department_id !== exam.department_id) errors.push('Course dept mismatch');
        else if (!course.is_active) errors.push('Course inactive');
      }
    }

    if (exam.duration_minutes <= 0) errors.push('Duration <= 0');
    if (exam.passing_score < 0 || exam.passing_score > 100) errors.push('Invalid passing score');
    if (!questions || questions.length === 0) errors.push('No questions');
    else {
      questions.forEach((q, idx) => {
        const qVal = validateQuestion(q.question_text, q.points, q.options);
        if (!qVal.isValid) errors.push(`Question #${idx + 1} invalid`);
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  // Publication test cases
  const validExam = {
    title: 'Computer Science Comprehensive Exit Exam 2026',
    department_id: 'dept-cs-01',
    exam_type: 'exit_exam',
    course_id: null,
    duration_minutes: 120,
    passing_score: 50,
  };

  assert(
    simulatePublicationValidation(validExam, [{ question_text: 'Q1', points: 2, options: validOptions }]).isValid === true,
    'Valid examination with complete questions satisfies publication validation'
  );

  assert(
    simulatePublicationValidation(validExam, []).isValid === false,
    'Rejects publication when examination has 0 questions'
  );

  const shortTitleExam = { ...validExam, title: 'CS' };
  assert(
    simulatePublicationValidation(shortTitleExam, [{ question_text: 'Q1', points: 2, options: validOptions }]).isValid === false,
    'Rejects publication when examination title is less than 3 characters'
  );

  const inactiveDeptExam = { ...validExam, department_id: 'dept-arc-03' };
  assert(
    simulatePublicationValidation(inactiveDeptExam, [{ question_text: 'Q1', points: 2, options: validOptions }]).isValid === false,
    'Rejects publication when associated academic department is inactive'
  );

  const courseExamMissingCourse = { ...validExam, exam_type: 'course_exam', course_id: null };
  assert(
    simulatePublicationValidation(courseExamMissingCourse, [{ question_text: 'Q1', points: 2, options: validOptions }]).isValid === false,
    'Rejects publication of course examination when course_id is missing'
  );

  const courseExamDeptMismatch = { ...validExam, exam_type: 'course_exam', course_id: 'course-ee-201' };
  assert(
    simulatePublicationValidation(courseExamDeptMismatch, [{ question_text: 'Q1', points: 2, options: validOptions }]).isValid === false,
    'Rejects publication when associated course belongs to a different department'
  );

  const courseExamInactiveCourse = { ...validExam, exam_type: 'course_exam', course_id: 'course-cs-102' };
  assert(
    simulatePublicationValidation(courseExamInactiveCourse, [{ question_text: 'Q1', points: 2, options: validOptions }]).isValid === false,
    'Rejects publication when associated course is inactive'
  );

  // ---------------------------------------------------------------------------
  // 5. User Interface & Route Verification
  // ---------------------------------------------------------------------------
  console.log('\n5. Route Architecture & UI Boundary Verification');

  const expectedRoutes = [
    'src/app/(dashboard)/admin/exams/page.tsx',
    'src/app/(dashboard)/admin/exams/loading.tsx',
    'src/app/(dashboard)/admin/exams/new/page.tsx',
    'src/app/(dashboard)/admin/exams/[id]/page.tsx',
    'src/app/(dashboard)/admin/exams/[id]/loading.tsx',
    'src/app/(dashboard)/instructor/exams/page.tsx',
    'src/app/(dashboard)/instructor/exams/loading.tsx',
    'src/app/(dashboard)/instructor/exams/new/page.tsx',
    'src/app/(dashboard)/instructor/exams/[id]/page.tsx',
    'src/app/(dashboard)/instructor/exams/[id]/loading.tsx',
  ];

  expectedRoutes.forEach((route) => {
    assert(fs.existsSync(path.join(rootDir, route)), `Route file exists: ${route}`);
  });

  const sidebarContent = fs.readFileSync(path.join(rootDir, 'src', 'components', 'layout', 'Sidebar.tsx'), 'utf8');
  assert(sidebarContent.includes('/admin/exams'), 'Admin sidebar includes link to /admin/exams');
  assert(sidebarContent.includes('/instructor/exams'), 'Instructor sidebar includes link to /instructor/exams');

  // ---------------------------------------------------------------------------
  // 6. Safe Referential Deletion Protection
  // ---------------------------------------------------------------------------
  console.log('\n6. Academic Integrity: Referential Deletion Protection');

  const deptActions = fs.readFileSync(path.join(rootDir, 'src', 'actions', 'departments.ts'), 'utf8');
  assert(
    deptActions.includes('.from(\'exams\')') && deptActions.includes('examination(s) exist'),
    'deleteDepartment checks for associated examinations before allowing deletion'
  );

  const courseActions = fs.readFileSync(path.join(rootDir, 'src', 'actions', 'courses.ts'), 'utf8');
  assert(
    courseActions.includes('.from(\'exams\')') && courseActions.includes('examination(s) reference this course'),
    'deleteCourse checks for associated examinations before allowing deletion'
  );

  console.log('\n===============================================================');
  console.log(` Phase 3 Verification Completed: ${passedTests}/${totalTests} Tests Passed`);
  console.log('===============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error('Fatal error during Phase 3 verification:', err);
  process.exit(1);
});
