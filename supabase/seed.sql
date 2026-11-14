-- ==============================================================================
-- EXITEXAM PREP — Phase 1: Academic Structure Seed Data
-- ==============================================================================

-- 1. Insert Sample Academic Departments
INSERT INTO public.departments (id, name, code, description, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Computer Science & Engineering', 'CSE', 'Department of Computer Science, Software Engineering, and AI', true),
    ('a0000000-0000-0000-0000-000000000002', 'Electrical & Computer Engineering', 'ECE', 'Department of Electrical, Electronics, and Telecommunications', true),
    ('a0000000-0000-0000-0000-000000000003', 'Civil & Environmental Engineering', 'CEE', 'Department of Structural, Environmental, and Infrastructure Engineering', true),
    ('a0000000-0000-0000-0000-000000000004', 'Business & Economics', 'BUE', 'School of Business Administration, Accounting, and Economics', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Sample Courses
INSERT INTO public.courses (id, code, title, description, department_id, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'CSE301', 'Data Structures & Algorithms', 'Fundamental algorithms, complexity analysis, and tree/graph structures', 'a0000000-0000-0000-0000-000000000001', true),
    ('c0000000-0000-0000-0000-000000000002', 'CSE304', 'Database Systems & SQL', 'Relational database design, normalization, ACID properties, and query optimization', 'a0000000-0000-0000-0000-000000000001', true),
    ('c0000000-0000-0000-0000-000000000003', 'CSE410', 'Operating Systems', 'Concurrency, virtual memory, process scheduling, and file systems', 'a0000000-0000-0000-0000-000000000001', true),
    ('c0000000-0000-0000-0000-000000000004', 'CSE420', 'Computer Networks & Security', 'OSI model, TCP/IP, cryptographic foundations, and network security', 'a0000000-0000-0000-0000-000000000001', true),
    ('c0000000-0000-0000-0000-000000000005', 'ECE201', 'Signals and Systems', 'Continuous and discrete signals, Fourier transforms, and frequency response', 'a0000000-0000-0000-0000-000000000002', true),
    ('c0000000-0000-0000-0000-000000000006', 'ECE305', 'Digital Logic Design', 'Combinational logic, sequential circuits, state machines, and FPGA basics', 'a0000000-0000-0000-0000-000000000002', true),
    ('c0000000-0000-0000-0000-000000000007', 'CEE210', 'Structural Mechanics', 'Stress-strain analysis, axial load, bending moments, and beam deflection', 'a0000000-0000-0000-0000-000000000003', true),
    ('c0000000-0000-0000-0000-000000000008', 'BUE101', 'Principles of Financial Accounting', 'Double-entry bookkeeping, financial statements, and balance sheets', 'a0000000-0000-0000-0000-000000000004', true)
ON CONFLICT (department_id, code) DO NOTHING;
