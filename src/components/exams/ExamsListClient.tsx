'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import {
  deleteExam,
  publishExam,
  unpublishExam,
  archiveExam,
  validateExamForPublication,
} from '@/actions/exams';
import type { ExamWithDetails, Department, ExamStatus, ExamType } from '@/types/database.types';
import {
  Award,
  BookOpen,
  Plus,
  Search,
  Filter,
  Clock,
  FileCheck,
  Calendar,
  Trash2,
  Send,
  RefreshCw,
  Archive,
  ArrowRight,
  XCircle,
  Building2,
} from 'lucide-react';

interface ExamsListClientProps {
  initialExams: ExamWithDetails[];
  departments: Department[];
  isInstructor?: boolean;
  basePath: string;
}

export function ExamsListClient({
  initialExams,
  departments,
  isInstructor = false,
  basePath,
}: ExamsListClientProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Actions & Dialogs
  const [examToDelete, setExamToDelete] = useState<ExamWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Validation Failure Modal
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [failedExamId, setFailedExamId] = useState<string | null>(null);

  // Quick stats
  const totalCount = initialExams.length;
  const publishedCount = initialExams.filter((e) => e.status === 'published').length;
  const draftCount = initialExams.filter((e) => e.status === 'draft').length;
  const archivedCount = initialExams.filter((e) => e.status === 'archived').length;

  // Filtration
  const filteredExams = initialExams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.description && exam.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exam.department && exam.department.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exam.department && exam.department.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exam.course && exam.course.code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDeptFilter === 'all' || exam.department_id === selectedDeptFilter;
    const matchesType = selectedTypeFilter === 'all' || exam.exam_type === selectedTypeFilter;
    const matchesStatus = selectedStatusFilter === 'all' || exam.status === selectedStatusFilter;

    return matchesSearch && matchesDept && matchesType && matchesStatus;
  });

  const deptOptions = [
    { value: 'all', label: 'All Departments' },
    ...departments.map((d) => ({
      value: d.id,
      label: `${d.code} — ${d.name}`,
    })),
  ];

  const typeOptions = [
    { value: 'all', label: 'All Exam Types' },
    { value: 'exit_exam', label: 'Exit Examinations' },
    { value: 'course_exam', label: 'Course Examinations' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  // Quick Publish
  async function handleQuickPublish(examId: string) {
    setIsLoading(true);
    setActionError(null);
    setValidationIssues([]);

    const validation = await validateExamForPublication(examId);
    if (!validation.isValid) {
      setIsLoading(false);
      setValidationIssues(validation.errors);
      setFailedExamId(examId);
      return;
    }

    const res = await publishExam(examId);
    setIsLoading(false);

    if (res.error) {
      setActionError(res.error);
      if (res.validationErrors) {
        setValidationIssues(res.validationErrors);
        setFailedExamId(examId);
      }
    } else {
      setActionSuccess('Examination published successfully.');
      router.refresh();
    }
  }

  // Quick Revert to Draft
  async function handleQuickUnpublish(examId: string) {
    setIsLoading(true);
    setActionError(null);

    const res = await unpublishExam(examId);
    setIsLoading(false);

    if (res.error) {
      setActionError(res.error);
    } else {
      setActionSuccess('Examination reverted to Draft.');
      router.refresh();
    }
  }

  // Quick Archive
  async function handleQuickArchive(examId: string) {
    setIsLoading(true);
    setActionError(null);

    const res = await archiveExam(examId);
    setIsLoading(false);

    if (res.error) {
      setActionError(res.error);
    } else {
      setActionSuccess('Examination archived.');
      router.refresh();
    }
  }

  // Delete Confirm
  async function handleDeleteConfirm() {
    if (!examToDelete) return;
    setIsLoading(true);
    setActionError(null);

    const res = await deleteExam(examToDelete.id);
    setIsLoading(false);
    setExamToDelete(null);

    if (res.error) {
      setActionError(res.error);
    } else {
      setActionSuccess('Examination deleted successfully.');
      router.refresh();
    }
  }

  const getStatusBadgeVariant = (status: ExamStatus) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'archived':
        return 'warning';
      case 'draft':
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Examination Architecture & Question Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isInstructor
              ? 'Author and configure exit exams and course exams for your assigned academic departments'
              : 'University-wide examination and question bank governance across all faculties'}
          </p>
        </div>

        <Link href={`${basePath}/new`}>
          <Button variant="primary" size="md">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Examination
          </Button>
        </Link>
      </div>

      {/* Notifications */}
      {actionError && (
        <Alert type="error" title="Action Error">
          {actionError}
        </Alert>
      )}

      {actionSuccess && (
        <Alert type="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Examinations</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Configured exam modules</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-emerald-600">Published Active</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{publishedCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Available for candidates</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-600">Draft Work-in-Progress</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">{draftCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Incomplete or pending review</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-amber-600">Archived Retained</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">{archivedCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Historical records</p>
        </div>
      </div>

      {/* Filtration & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search exams by title, course, or dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              {deptOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Examinations List / Table */}
      {filteredExams.length === 0 ? (
        <EmptyState
          icon={<Award className="h-6 w-6" />}
          title={totalCount === 0 ? 'No Examinations Created' : 'No Matching Examinations'}
          description={
            totalCount === 0
              ? 'Get started by creating your first Exit Examination or Course Examination.'
              : 'No examinations match your current filters. Try resetting the search terms or filters.'
          }
          actionText={totalCount === 0 ? 'Create Examination' : 'Reset Filters'}
          onAction={() => {
            if (totalCount === 0) {
              router.push(`${basePath}/new`);
            } else {
              setSearchQuery('');
              setSelectedDeptFilter('all');
              setSelectedTypeFilter('all');
              setSelectedStatusFilter('all');
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Exam Info */}
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(exam.status)}>
                    {exam.status.toUpperCase()}
                  </Badge>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {exam.exam_type === 'exit_exam' ? (
                      <>
                        <Award className="h-3 w-3" /> Exit Exam
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-3 w-3" /> Course Exam
                      </>
                    )}
                  </span>

                  {exam.department && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {exam.department.code} — {exam.department.name}
                    </span>
                  )}

                  {exam.course && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      {exam.course.code}: {exam.course.title}
                    </span>
                  )}
                </div>

                <Link
                  href={`${basePath}/${exam.id}`}
                  className="block text-base font-bold text-slate-900 hover:text-emerald-600 transition-colors truncate"
                >
                  {exam.title}
                </Link>

                {exam.description && (
                  <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">
                    {exam.description}
                  </p>
                )}

                {/* Metrics */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {exam.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <FileCheck className="h-3.5 w-3.5" /> {exam.total_questions} question(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Year {exam.exam_year}
                  </span>
                  <span>Pass: {exam.passing_score}%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                {exam.status === 'draft' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPublish(exam.id)}
                    isLoading={isLoading}
                    title="Validate & Publish"
                  >
                    <Send className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                    Publish
                  </Button>
                )}

                {exam.status === 'published' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickUnpublish(exam.id)}
                    isLoading={isLoading}
                    title="Revert to Draft"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-slate-500 mr-1" />
                    Draft
                  </Button>
                )}

                {exam.status === 'published' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickArchive(exam.id)}
                    isLoading={isLoading}
                    title="Archive Exam"
                  >
                    <Archive className="h-3.5 w-3.5 text-amber-600" />
                  </Button>
                )}

                <Link href={`${basePath}/${exam.id}`}>
                  <Button variant="primary" size="sm">
                    Manage <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExamToDelete(exam)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  title="Delete Exam"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Exam Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(examToDelete)}
        onClose={() => setExamToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Examination"
        message={`Are you sure you want to delete "${examToDelete?.title}"? All associated questions and options will be permanently removed. This cannot be undone.`}
        confirmText="Permanently Delete"
        isDestructive={true}
        isLoading={isLoading}
      />

      {/* Publication Validation Issues Modal */}
      <Modal
        isOpen={Boolean(failedExamId)}
        onClose={() => {
          setFailedExamId(null);
          setValidationIssues([]);
        }}
        title="Publication Requirements Unmet"
        description="The examination cannot be published until the following criteria are resolved:"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {validationIssues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-rose-200 bg-rose-50/60 text-xs font-medium text-rose-800 flex items-start gap-2"
              >
                <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{issue}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            {failedExamId && (
              <Link href={`${basePath}/${failedExamId}`}>
                <Button variant="primary" size="sm">
                  Go to Question Manager
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
