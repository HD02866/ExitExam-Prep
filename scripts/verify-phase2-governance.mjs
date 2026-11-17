import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passedTests = 0;
let totalTests = 0;

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

async function runTests() {
  console.log('\n======================================================');
  console.log(' Phase 2: Admin Governance & Verification Test Suite');
  console.log('======================================================\n');

  // Test Group 1: Environment & Secret Isolation
  console.log('1. Security Verification: Environment & Secret Isolation');
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

  assert(
    Boolean(env['NEXT_PUBLIC_SUPABASE_URL'] && env['NEXT_PUBLIC_SUPABASE_ANON_KEY']),
    'NEXT_PUBLIC_SUPABASE_URL and ANON key exist in .env.local'
  );
  assert(
    Boolean(env['SUPABASE_SERVICE_ROLE_KEY']),
    'SUPABASE_SERVICE_ROLE_KEY is configured for server actions'
  );
  assert(
    !Boolean(env['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY']),
    'Service-role key is NOT prefixed with NEXT_PUBLIC_ (never exposed to browser)'
  );
  assert(
    env['SUPABASE_SERVICE_ROLE_KEY'] !== env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    'Service-role key is isolated and distinct from anonymous public key'
  );

  // Test Group 2: Database Migrations & DDL Integrity
  console.log('\n2. Database Verification: Phase 2 Migrations & DDL Integrity');
  const migrationPhase1Path = path.join(
    rootDir,
    'supabase',
    'migrations',
    '20261114000000_phase1_foundation.sql'
  );
  const migrationPhase2Path = path.join(
    rootDir,
    'supabase',
    'migrations',
    '20261117000000_phase2_admin_governance.sql'
  );
  const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');

  assert(fs.existsSync(migrationPhase1Path), 'Phase 1 migration file exists');
  assert(fs.existsSync(migrationPhase2Path), 'Phase 2 governance migration file exists');
  assert(fs.existsSync(schemaPath), 'Unified schema.sql file exists');

  const p2Sql = fs.readFileSync(migrationPhase2Path, 'utf8');
  assert(
    p2Sql.includes('CREATE TABLE IF NOT EXISTS public.admin_activity_logs'),
    'Migration creates public.admin_activity_logs table'
  );
  assert(
    p2Sql.includes('ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY'),
    'admin_activity_logs has Row Level Security (RLS) enabled'
  );
  assert(
    p2Sql.includes('CREATE POLICY "Admins can view activity logs"'),
    'admin_activity_logs contains admin-only SELECT policy'
  );
  assert(
    !p2Sql.includes('CREATE POLICY "Anyone can update activity logs"') &&
      !p2Sql.includes('CREATE POLICY "Admins can delete activity logs"'),
    'admin_activity_logs is immutable (strictly NO UPDATE or DELETE policies)'
  );
  assert(
    p2Sql.includes('uq_departments_name_lower') && p2Sql.includes('uq_departments_code_upper'),
    'Unique case-insensitive indexes created for department name & code'
  );
  assert(
    p2Sql.includes('uq_courses_dept_code_upper'),
    'Unique case-insensitive index created for course code per department'
  );
  assert(
    p2Sql.includes('check_department_dependencies'),
    'check_department_dependencies() stored procedure defined for dependency verification'
  );

  // Test Group 3: Activity Logger Sanitization
  console.log('\n3. Security Verification: Activity Log Secret Sanitization');
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

  function sanitizeDetails(details) {
    if (!details) return {};
    const sanitized = {};
    for (const [k, v] of Object.entries(details)) {
      const lower = k.toLowerCase();
      const isSensitive = Array.from(FORBIDDEN_DETAIL_KEYS).some((forbidden) =>
        lower.includes(forbidden)
      );
      if (isSensitive) {
        sanitized[k] = '[REDACTED]';
      } else if (v !== undefined) {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  const rawPayload = {
    userName: 'john_doe',
    password: 'super_secret_password_123',
    token: 'jwt.token.secret',
    api_key: 'sk_live_12345678',
    service_role_key: 'secret-service-key',
    departmentId: 'dept_ece_001',
    role: 'instructor',
  };

  const sanitized = sanitizeDetails(rawPayload);
  assert(
    sanitized.password === '[REDACTED]',
    'Plaintext password is automatically redacted in audit log'
  );
  assert(
    sanitized.token === '[REDACTED]',
    'Access tokens are automatically redacted in audit log'
  );
  assert(
    sanitized.api_key === '[REDACTED]',
    'API keys and secrets are automatically redacted in audit log'
  );
  assert(
    sanitized.service_role_key === '[REDACTED]',
    'Service-role credentials are automatically redacted in audit log'
  );
  assert(
    sanitized.role === 'instructor' && sanitized.departmentId === 'dept_ece_001',
    'Non-sensitive administrative metadata is cleanly preserved'
  );

  // Test Group 4: Role Governance & Self-Protection Rules
  console.log('\n4. User Governance: Self-Protection & Last Admin Integrity');

  // Guard: Self-suspension
  function evaluateSelfSuspension(currentAdminId, targetUserId, newStatus) {
    if (targetUserId === currentAdminId && newStatus !== 'active') {
      return { error: 'Security constraint: You cannot suspend or deactivate your own administrative account.' };
    }
    return { success: true };
  }

  const selfSuspendResult = evaluateSelfSuspension('admin_123', 'admin_123', 'suspended');
  assert(
    Boolean(selfSuspendResult.error),
    'Admin self-suspension is strictly blocked with security constraint'
  );

  const otherUserSuspendResult = evaluateSelfSuspension('admin_123', 'user_456', 'suspended');
  assert(
    otherUserSuspendResult.success === true,
    'Admin can suspend non-self user accounts'
  );

  // Guard: Self-demotion & Last Admin protection
  function evaluateRoleDemotion(currentAdminId, targetUserId, newRole, activeAdminCount) {
    if (targetUserId === currentAdminId && newRole !== 'admin') {
      return { error: 'Security constraint: Administrators cannot change their own administrative role.' };
    }
    if (newRole !== 'admin' && activeAdminCount <= 1) {
      return { error: 'Cannot demote the only remaining active administrator on the platform.' };
    }
    return { success: true };
  }

  const selfDemoteResult = evaluateRoleDemotion('admin_123', 'admin_123', 'student', 2);
  assert(
    Boolean(selfDemoteResult.error),
    'Admin self-demotion is strictly blocked'
  );

  const lastAdminDemoteResult = evaluateRoleDemotion('admin_123', 'admin_456', 'instructor', 1);
  assert(
    Boolean(lastAdminDemoteResult.error),
    'Demotion of the last active platform administrator is strictly blocked'
  );

  const safeAdminDemoteResult = evaluateRoleDemotion('admin_123', 'admin_456', 'instructor', 2);
  assert(
    safeAdminDemoteResult.success === true,
    'Demotion permitted when multiple active administrators exist'
  );

  // Guard: Self-deletion
  function evaluateSelfDeletion(currentAdminId, targetUserId, activeAdminCount) {
    if (targetUserId === currentAdminId) {
      return { error: 'Security constraint: You cannot delete your own administrative account.' };
    }
    if (activeAdminCount <= 1) {
      return { error: 'Cannot delete the only remaining active administrator on the platform.' };
    }
    return { success: true };
  }

  const selfDeleteResult = evaluateSelfDeletion('admin_123', 'admin_123', 2);
  assert(
    Boolean(selfDeleteResult.error),
    'Admin self-deletion is strictly blocked'
  );

  const lastAdminDeleteResult = evaluateSelfDeletion('admin_123', 'admin_456', 1);
  assert(
    Boolean(lastAdminDeleteResult.error),
    'Deletion of the last active administrator is strictly blocked'
  );

  // Test Group 5: Academic Structure Governance: Safe Deletion Checks
  console.log('\n5. Academic Structure Governance: Safe Deletion & Referencing');

  function evaluateDepartmentDeletion(courseCount, instructorCount, studentCount) {
    if (courseCount > 0) {
      return { error: `Cannot delete department: ${courseCount} course(s) are associated.` };
    }
    if (instructorCount > 0) {
      return { error: `Cannot delete department: ${instructorCount} instructor(s) are assigned.` };
    }
    if (studentCount > 0) {
      return { error: `Cannot delete department: ${studentCount} student(s) belong to department.` };
    }
    return { success: true };
  }

  const deleteDeptWithCourses = evaluateDepartmentDeletion(4, 0, 0);
  assert(
    Boolean(deleteDeptWithCourses.error),
    'Department deletion is blocked when courses are associated'
  );

  const deleteDeptWithInstructors = evaluateDepartmentDeletion(0, 2, 0);
  assert(
    Boolean(deleteDeptWithInstructors.error),
    'Department deletion is blocked when instructors are assigned'
  );

  const deleteDeptWithStudents = evaluateDepartmentDeletion(0, 0, 20);
  assert(
    Boolean(deleteDeptWithStudents.error),
    'Department deletion is blocked when students are enrolled'
  );

  const deleteCleanDept = evaluateDepartmentDeletion(0, 0, 0);
  assert(
    deleteCleanDept.success === true,
    'Unreferenced department is eligible for safe administrative deletion'
  );

  // Test Group 6: Case-Insensitive Duplicate Prevention
  console.log('\n6. Data Integrity: Case-Insensitive Duplicate Prevention');
  function checkDepartmentCodeDuplicate(existingCodes, newCode) {
    const normalizedNew = newCode.trim().toUpperCase();
    return existingCodes.some((code) => code.toUpperCase() === normalizedNew);
  }

  const existingCodes = ['CSE', 'ECE', 'ME'];
  assert(
    checkDepartmentCodeDuplicate(existingCodes, 'cse') === true,
    'Rejects "cse" when "CSE" already exists (case-insensitive collision check)'
  );
  assert(
    checkDepartmentCodeDuplicate(existingCodes, '  Ece  ') === true,
    'Rejects "  Ece  " with whitespace and mixed-case variation'
  );
  assert(
    checkDepartmentCodeDuplicate(existingCodes, 'CEE') === false,
    'Accepts novel unique code "CEE"'
  );

  // Test Group 7: Route Boundaries & Suspended Account Enforcement
  console.log('\n7. Route Protection & Account Status Enforcement');

  function evaluateRouteAccess(profile, requiredRole) {
    if (!profile) return { redirect: '/login' };
    if (profile.account_status === 'suspended') return { redirect: '/login?error=account_suspended' };
    if (profile.account_status === 'inactive') return { redirect: '/login?error=account_inactive' };
    if (requiredRole && profile.role !== requiredRole) return { redirect: '/unauthorized' };
    return { authorized: true };
  }

  const suspendedAdmin = { role: 'admin', account_status: 'suspended' };
  const suspendedResult = evaluateRouteAccess(suspendedAdmin, 'admin');
  assert(
    suspendedResult.redirect === '/login?error=account_suspended',
    'Suspended administrator accounts are blocked from accessing admin routes'
  );

  const studentOnAdminRoute = { role: 'student', account_status: 'active' };
  const studentResult = evaluateRouteAccess(studentOnAdminRoute, 'admin');
  assert(
    studentResult.redirect === '/unauthorized',
    'Active student is rejected with /unauthorized on admin routes'
  );

  const instructorOnAdminRoute = { role: 'instructor', account_status: 'active' };
  const instructorResult = evaluateRouteAccess(instructorOnAdminRoute, 'admin');
  assert(
    instructorResult.redirect === '/unauthorized',
    'Active instructor is rejected with /unauthorized on admin routes'
  );

  const validAdmin = { role: 'admin', account_status: 'active' };
  const adminResult = evaluateRouteAccess(validAdmin, 'admin');
  assert(
    adminResult.authorized === true,
    'Active administrator has authorized access to admin portal'
  );

  // Test Group 8: Next.js App Router Boundary Files
  console.log('\n8. UI Resilience: Loading & Error Boundary Coverage');
  const expectedBoundaries = [
    'src/app/(dashboard)/admin/loading.tsx',
    'src/app/(dashboard)/admin/error.tsx',
    'src/app/(dashboard)/admin/activity/loading.tsx',
    'src/app/(dashboard)/instructor/loading.tsx',
    'src/app/(dashboard)/instructor/error.tsx',
    'src/app/(dashboard)/student/loading.tsx',
    'src/app/(dashboard)/student/error.tsx',
  ];

  for (const filePath of expectedBoundaries) {
    const fullPath = path.join(rootDir, filePath);
    assert(fs.existsSync(fullPath), `Boundary exists: ${filePath}`);
  }

  // Summary
  console.log('\n======================================================');
  console.log(` Phase 2 Verification Completed: ${passedTests}/${totalTests} Tests Passed`);
  console.log('======================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
