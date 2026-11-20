'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuestionModal } from './QuestionModal';
import { ExamForm } from './ExamForm';
import {
  publishExam,
  unpublishExam,
  archiveExam,
  deleteExam,
  validateExamForPublication,
} from '@/actions/exams';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  type QuestionInput,
} from '@/actions/questions';
import type {
  ExamWithDetails,
  QuestionWithOptions,
  Department,
  Course,
  OptionKey,
} from '@/types/database.types';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Settings,
  HelpCircle,
  FileCheck,
  Send,
  Archive,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface ExamDetailManagerProps {
  exam: ExamWithDetails;
  initialQuestions: QuestionWithOptions[];
  departments: Department[];
  courses: Course[];
  isInstructor?: boolean;
  basePath: string;
}

export function ExamDetailManager({
  exam,
  initialQuestions,
  departments,
  courses,
  isInstructor = false,
  basePath,
}: ExamDetailManagerProps) {
  const router = useRouter();

  // Active view tab: 'questions' | 'preview' | 'settings'
  const [activeTab, setActiveTab] = useState<'questions' | 'preview' | 'settings'>('questions');

  // Question Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionWithOptions | null>(null);

  // Destructive Confirmation Dialogs
  const [questionToDelete, setQuestionToDelete] = useState<QuestionWithOptions | null>(null);
  const [isDeleteExamModalOpen, setIsDeleteExamModalOpen] = useState(false);
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Publication Readiness Modal / Feedback
  const [isPublishing, setIsPublishing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Preview Simulator State
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, OptionKey>>({});
  const [showAnswerKey, setShowAnswerKey] = useState(true);

  // Sort questions by order
  const questions = [...initialQuestions].sort((a, b) => a.question_order - b.question_order);
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  // 1. Create or Update Question
  async function handleQuestionSubmit(data: QuestionInput): Promise<string | undefined> {
    setActionError(null);
    let res;
    if (editingQuestion) {
      res = await updateQuestion(editingQuestion.id, data);
    } else {
      res = await createQuestion(exam.id, data);
    }

    if (res.error) {
      return res.error;
    }

    setActionSuccess(editingQuestion ? 'Question updated successfully.' : 'Question added successfully.');
    setEditingQuestion(null);
    router.refresh();
    return undefined;
  }

  // 2. Delete Question
  async function handleDeleteQuestionConfirm() {
    if (!questionToDelete) return;
    setIsActionLoading(true);
    setActionError(null);

    const res = await deleteQuestion(questionToDelete.id);
    setIsActionLoading(false);
    setQuestionToDelete(null);

    if (res.error) {
      setActionError(res.error);
    } else {
      setActionSuccess('Question deleted successfully.');
      router.refresh();
    }
  }

  // 3. Reorder Questions
  async function handleMoveQuestion(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const newOrder = [...questions];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const orderedIds = newOrder.map((q) => q.id);
    const res = await reorderQuestions(exam.id, orderedIds);
    if (res.error) {
      setActionError(res.error);
    } else {
      router.refresh();
    }
  }

  // 4. Publish Exam
  async function handlePublish() {
    setIsPublishing(true);
    setActionError(null);
    setValidationIssues([]);

    // Check validation first
    const validation = await validateExamForPublication(exam.id);
    if (!validation.isValid) {
      setIsPublishing(false);
      setValidationIssues(validation.errors);
      setShowValidationModal(true);
      return;
    }

    const res = await publishExam(exam.id);
    setIsPublishing(false);

    if (res.error) {
      setActionError(res.error);
      if (res.validationErrors) {
        setValidationIssues(res.validationErrors);
        setShowValidationModal(true);
      }
    } else {
      setActionSuccess('Examination published successfully. It is now active for future evaluation.');
      router.refresh();
    }
  }

  // 5. Unpublish Exam (revert to draft)
  async function handleUnpublishConfirm() {
    setIsActionLoading(true);
    setActionError(null);

    const res = await unpublishExam(exam.id);
    setIsActionLoading(false);
    setIsUnpublishModalOpen(false);

    if (res.error) {
      setActionError(res.error);
    } else {
      setActionSuccess('Examination reverted to Draft.');
      router.refresh();
    }
  }

  // 6. Archive Exam
  async function handleArchiveConfirm() {
    setIsActionLoading(true);
    setActionError(null);

    const res = await archiveExam(exam.id);
    setIsActionLoading(false);
    setIsArchiveModalOpen(false);

    if (res.error) {
      setActionError(res.error);
    } else {
      setActionSuccess('Examination archived. It is unavailable for new student attempts.');
      router.refresh();
    }
  }

  // 7. Delete Exam
  async function handleDeleteExamConfirm() {
    setIsActionLoading(true);
    setActionError(null);

    const res = await deleteExam(exam.id);
    setIsActionLoading(false);
    setIsDeleteExamModalOpen(false);

    if (res.error) {
      setActionError(res.error);
    } else {
      router.push(basePath);
      router.refresh();
    }
  }

  const statusVariant = {
    draft: 'default' as const,
    published: 'success' as const,
    archived: 'warning' as const,
  }[exam.status];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={basePath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Examinations
        </Link>
        <span className="text-xs text-slate-400 font-mono">ID: {exam.id}</span>
      </div>

      {/* Action Notifications */}
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

      {/* Examination Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant}>
                {exam.status.toUpperCase()}
              </Badge>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {exam.exam_type === 'exit_exam' ? (
                  <>
                    <Award className="h-3 w-3" /> Exit Examination
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3 w-3" /> Course Examination
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

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {exam.title}
            </h1>

            {exam.description && (
              <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                {exam.description}
              </p>
            )}

            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <strong>{exam.duration_minutes}</strong> min duration
              </span>
              <span className="flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                <strong>{questions.length}</strong> questions
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-slate-400" />
                <strong>{totalPoints}</strong> total points
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Cohort Year <strong>{exam.exam_year}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                Pass mark <strong>{exam.passing_score}%</strong>
              </span>
            </div>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {exam.status === 'draft' && (
              <Button
                variant="primary"
                onClick={handlePublish}
                isLoading={isPublishing}
                size="md"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Publish Examination
              </Button>
            )}

            {exam.status === 'published' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsUnpublishModalOpen(true)}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Revert to Draft
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setIsArchiveModalOpen(true)}
                  size="sm"
                >
                  <Archive className="h-4 w-4 mr-1.5" />
                  Archive
                </Button>
              </>
            )}

            {exam.status === 'archived' && (
              <Button
                variant="outline"
                onClick={() => setIsUnpublishModalOpen(true)}
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Restore to Draft
              </Button>
            )}

            <Button
              variant="danger"
              onClick={() => setIsDeleteExamModalOpen(true)}
              size="sm"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'questions'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Questions & Answers ({questions.length})
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="h-4 w-4" />
            Examination Preview
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="h-4 w-4" />
            Readiness & Settings
          </button>
        </nav>
      </div>

      {/* TAB 1: Questions Management */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">Question Bank</h2>
              <p className="text-xs text-slate-500">
                {questions.length} question(s) configured • Total worth: {totalPoints} point(s)
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingQuestion(null);
                setIsQuestionModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Questions Added Yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Examinations require at least one question with 4 answer options before they can be published.
              </p>
              <div className="mt-5">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingQuestion(null);
                    setIsQuestionModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add First Question
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const qNum = idx + 1;
                const sortedOpts = [...(q.options || [])].sort((a, b) =>
                  a.option_key.localeCompare(b.option_key)
                );

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Order & Reordering Controls */}
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-mono text-xs font-bold shadow-xs">
                            #{qNum}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              aria-label="Move question up"
                              className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-100 transition-colors"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === questions.length - 1}
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              aria-label="Move question down"
                              className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-100 transition-colors"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Statement & Points */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {Number(q.points)} pt{Number(q.points) !== 1 ? 's' : ''}
                            </span>
                            {q.explanation && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <HelpCircle className="h-3 w-3" /> Includes explanation
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                            {q.question_text}
                          </p>
                        </div>
                      </div>

                      {/* Question Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingQuestion(q);
                            setIsQuestionModalOpen(true);
                          }}
                          aria-label="Edit question"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQuestionToDelete(q)}
                          aria-label="Delete question"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                      {sortedOpts.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                            opt.is_correct
                              ? 'border-emerald-500 bg-emerald-50/60 font-semibold text-emerald-950'
                              : 'border-slate-200 bg-slate-50/50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`h-5 w-5 flex items-center justify-center rounded font-mono text-[10px] font-bold shrink-0 ${
                                opt.is_correct
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {opt.option_key}
                            </span>
                            <span className="truncate">{opt.option_text}</span>
                          </div>

                          {opt.is_correct && (
                            <span className="text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-100 flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="h-3 w-3" /> Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="ml-10 p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900">
                        <span className="font-semibold">Explanation: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Examination Preview Simulator */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-1">
                Student Simulation Mode
              </div>
              <h2 className="text-xl font-bold text-slate-900">{exam.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Test the candidate examination experience. (Answers will be protected from students in examination phases).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAnswerKey}
                  onChange={(e) => setShowAnswerKey(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                />
                Show Answer Key
              </label>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Add questions to the question bank to preview the candidate examination simulator.
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, idx) => {
                const qNum = idx + 1;
                const sortedOpts = [...(q.options || [])].sort((a, b) =>
                  a.option_key.localeCompare(b.option_key)
                );

                return (
                  <div key={q.id} className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-900">Question {qNum} of {questions.length}</span>
                      <span>{Number(q.points)} point{Number(q.points) !== 1 ? 's' : ''}</span>
                    </div>

                    <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap">
                      {q.question_text}
                    </p>

                    <div className="space-y-2 pt-1">
                      {sortedOpts.map((opt) => {
                        const isSelected = previewAnswers[q.id] === opt.option_key;
                        const isCorrectKey = opt.is_correct;

                        return (
                          <div
                            key={opt.id}
                            onClick={() =>
                              setPreviewAnswers({ ...previewAnswers, [q.id]: opt.option_key })
                            }
                            className={`p-3 rounded-lg border text-sm flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            } ${showAnswerKey && isCorrectKey ? 'border-emerald-500 bg-emerald-50/30' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`h-6 w-6 rounded-md font-mono text-xs font-bold flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {opt.option_key}
                              </span>
                              <span className="text-slate-800">{opt.option_text}</span>
                            </div>

                            {showAnswerKey && isCorrectKey && (
                              <span className="text-xs font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-100">
                                Answer Key
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {showAnswerKey && q.explanation && (
                      <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                        <strong className="text-slate-900">Explanation: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Publication Readiness & Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Publication Readiness Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Publication Integrity Checklist</h2>
              <p className="text-xs text-slate-500">
                All 10 academic and architectural criteria must pass before an examination can transition to Published status.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {[
                {
                  label: 'Examination title is valid (>= 3 chars)',
                  passed: Boolean(exam.title && exam.title.trim().length >= 3),
                },
                {
                  label: 'Academic department exists & is active',
                  passed: Boolean(exam.department && exam.department.is_active),
                },
                {
                  label: 'Course belongs to department & is active (if course exam)',
                  passed:
                    exam.exam_type !== 'course_exam' ||
                    Boolean(
                      exam.course &&
                        exam.course.department_id === exam.department_id &&
                        exam.course.is_active
                    ),
                },
                {
                  label: 'Examination duration is positive (> 0 min)',
                  passed: exam.duration_minutes > 0,
                },
                {
                  label: 'Passing score is between 0% and 100%',
                  passed: exam.passing_score >= 0 && exam.passing_score <= 100,
                },
                {
                  label: 'Contains at least one question',
                  passed: questions.length >= 1,
                },
                {
                  label: 'Every question has positive points (> 0)',
                  passed:
                    questions.length > 0 &&
                    questions.every((q) => Number(q.points) > 0),
                },
                {
                  label: 'Every question has exactly 4 options (A, B, C, D)',
                  passed:
                    questions.length > 0 &&
                    questions.every((q) => (q.options || []).length === 4),
                },
                {
                  label: 'Every question has non-blank options',
                  passed:
                    questions.length > 0 &&
                    questions.every((q) =>
                      (q.options || []).every((o) => o.option_text && o.option_text.trim().length > 0)
                    ),
                },
                {
                  label: 'Every question has exactly one correct answer',
                  passed:
                    questions.length > 0 &&
                    questions.every(
                      (q) =>
                        (q.options || []).filter((o) => o.is_correct === true).length === 1
                    ),
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border flex items-center gap-2.5 text-xs ${
                    item.passed
                      ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                      : 'border-rose-200 bg-rose-50/50 text-rose-900'
                  }`}
                >
                  {item.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Examination Form */}
          <ExamForm
            departments={departments}
            courses={courses}
            initialData={exam}
            isInstructor={isInstructor}
            basePath={basePath}
          />
        </div>
      )}

      {/* Question Create/Edit Modal */}
      <QuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => {
          setIsQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
        onSubmit={handleQuestionSubmit}
        initialData={editingQuestion}
        questionNumber={
          editingQuestion
            ? questions.findIndex((q) => q.id === editingQuestion.id) + 1
            : questions.length + 1
        }
      />

      {/* Delete Question Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(questionToDelete)}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={handleDeleteQuestionConfirm}
        title="Delete Question"
        message="Are you sure you want to delete this question? Its four answer options will be permanently removed."
        confirmText="Delete Question"
        isDestructive={true}
        isLoading={isActionLoading}
      />

      {/* Revert to Draft Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isUnpublishModalOpen}
        onClose={() => setIsUnpublishModalOpen(false)}
        onConfirm={handleUnpublishConfirm}
        title="Revert to Draft"
        message="Reverting this examination to Draft will make it invisible to any student interfaces and open it for modifications. Continue?"
        confirmText="Revert to Draft"
        isLoading={isActionLoading}
      />

      {/* Archive Examination Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={handleArchiveConfirm}
        title="Archive Examination"
        message="Archiving this examination removes it from active student examination access while preserving all questions and historical records. Continue?"
        confirmText="Archive Examination"
        isLoading={isActionLoading}
      />

      {/* Delete Examination Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteExamModalOpen}
        onClose={() => setIsDeleteExamModalOpen(false)}
        onConfirm={handleDeleteExamConfirm}
        title="Delete Examination"
        message={`Are you sure you want to delete "${exam.title}"? This will permanently delete the examination and all ${questions.length} question(s) with their answer options. This action cannot be undone.`}
        confirmText="Permanently Delete"
        isDestructive={true}
        isLoading={isActionLoading}
      />

      {/* Publication Validation Issues Modal */}
      <Modal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        title="Publication Requirements Unmet"
        description="The examination cannot be published until the following academic requirements are resolved:"
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

          <div className="flex justify-end pt-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowValidationModal(false);
                setActiveTab('questions');
              }}
            >
              Fix Questions
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
