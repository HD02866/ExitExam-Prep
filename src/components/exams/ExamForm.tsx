'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { createExam, updateExam } from '@/actions/exams';
import type { Department, Course, Exam, ExamType } from '@/types/database.types';
import { BookOpen, Award, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface ExamFormProps {
  departments: Department[];
  courses: Course[];
  initialData?: Exam | null;
  isInstructor?: boolean;
  basePath: string;
}

export function ExamForm({
  departments,
  courses,
  initialData,
  isInstructor = false,
  basePath,
}: ExamFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData);

  const [selectedDept, setSelectedDept] = useState<string>(
    initialData?.department_id || (departments.length === 1 ? departments[0].id : '')
  );
  const [examType, setExamType] = useState<ExamType>(
    initialData?.exam_type || 'exit_exam'
  );
  const [selectedCourse, setSelectedCourse] = useState<string>(
    initialData?.course_id || ''
  );
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [examYear, setExamYear] = useState<number>(
    initialData?.exam_year || new Date().getFullYear()
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialData?.duration_minutes || 60
  );
  const [maxAttempts, setMaxAttempts] = useState<number>(
    initialData?.max_attempts || 1
  );
  const [passingScore, setPassingScore] = useState<number>(
    initialData?.passing_score || 50
  );

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter courses based on selected department
  const filteredCourses = courses.filter((c) => c.department_id === selectedDept && c.is_active);

  const deptOptions = departments.map((d) => ({
    value: d.id,
    label: `${d.code} — ${d.name}${!d.is_active ? ' (Inactive)' : ''}`,
  }));

  const courseOptions = filteredCourses.map((c) => ({
    value: c.id,
    label: `${c.code} — ${c.title}`,
  }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    // Client-side quick checks
    if (!title.trim() || title.trim().length < 3) {
      setFormError('Examination title must be at least 3 characters long.');
      setIsLoading(false);
      return;
    }

    if (!selectedDept) {
      setFormError('Please select an academic department.');
      setIsLoading(false);
      return;
    }

    if (examType === 'course_exam' && !selectedCourse) {
      setFormError('Course examinations must have an associated course.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('departmentId', selectedDept);
    formData.append('examType', examType);
    if (selectedCourse) formData.append('courseId', selectedCourse);
    formData.append('examYear', String(examYear));
    formData.append('durationMinutes', String(durationMinutes));
    formData.append('maxAttempts', String(maxAttempts));
    formData.append('passingScore', String(passingScore));

    let result;
    if (isEditing && initialData) {
      result = await updateExam(initialData.id, null, formData);
    } else {
      result = await createExam(null, formData);
    }

    setIsLoading(false);

    if (result.error) {
      setFormError(result.error);
    } else {
      const targetId = result.examId || initialData?.id;
      router.push(`${basePath}/${targetId}`);
      router.refresh();
    }
  }

  if (departments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Award className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No Authorized Departments</h3>
        <p className="text-sm text-slate-500 mt-2">
          {isInstructor
            ? 'You have not been assigned to any academic departments. Contact your university administrator to receive department faculty authorization.'
            : 'No active academic departments exist. Please create and activate a department first.'}
        </p>
        <div className="mt-6">
          <Link href={basePath}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Return to Examinations
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {formError && (
        <Alert type="error" title="Submission Error">
          {formError}
        </Alert>
      )}

      {/* Basic Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">Examination Core Details</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Set the academic title, description, and faculty categorization for this examination
          </p>
        </div>

        <Input
          label="Examination Title"
          required
          placeholder="e.g., Computer Science Exit Examination 2026"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          helperText="A descriptive title recognized by faculty and students (minimum 3 characters)"
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description / Syllabus Overview
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Outline covered topics, target student cohort, or exam guidelines..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Academic Hierarchy Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <Select
            label="Academic Department"
            required
            options={deptOptions}
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedCourse('');
            }}
            placeholder="Select academic department"
            helperText={
              isInstructor
                ? 'Only departments you are authorized to manage are listed'
                : 'Administrative selection for any university faculty'
            }
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Examination Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setExamType('exit_exam');
                  setSelectedCourse('');
                }}
                className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  examType === 'exit_exam'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-100'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Award className="h-4 w-4 text-emerald-600" />
                Exit Exam
              </button>

              <button
                type="button"
                onClick={() => setExamType('course_exam')}
                className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  examType === 'course_exam'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-100'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="h-4 w-4 text-emerald-600" />
                Course Exam
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {examType === 'exit_exam'
                ? 'Comprehensive graduation exam (course association is optional)'
                : 'Specific course exam (associated course is required)'}
            </p>
          </div>
        </div>

        {/* Associated Course */}
        <div className="pt-2">
          <Select
            label={
              examType === 'course_exam'
                ? 'Associated Academic Course'
                : 'Associated Academic Course (Optional)'
            }
            required={examType === 'course_exam'}
            options={courseOptions}
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            placeholder={
              !selectedDept
                ? 'Select a department first'
                : filteredCourses.length === 0
                ? 'No active courses in this department'
                : 'Select curriculum course'
            }
            disabled={!selectedDept || filteredCourses.length === 0}
            helperText={
              examType === 'course_exam'
                ? 'Course examinations must be directly linked to an active department course'
                : 'Exit exams cover the full curriculum; optional to focus on a particular course'
            }
          />
        </div>
      </div>

      {/* Parameters & Configuration Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">Examination Parameters</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure examination timing, scoring thresholds, and academic cohort year
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Input
            label="Examination Year"
            type="number"
            min={2000}
            max={2100}
            required
            value={examYear}
            onChange={(e) => setExamYear(parseInt(e.target.value, 10))}
            helperText="e.g. 2026"
          />

          <Input
            label="Duration (Minutes)"
            type="number"
            min={1}
            max={480}
            required
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
            helperText="e.g. 60 or 120 min"
          />

          <Input
            label="Maximum Attempts"
            type="number"
            min={1}
            max={10}
            required
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10))}
            helperText="Attempts per student"
          />

          <Input
            label="Passing Score (%)"
            type="number"
            step="0.5"
            min={0}
            max={100}
            required
            value={passingScore}
            onChange={(e) => setPassingScore(parseFloat(e.target.value))}
            helperText="e.g. 50% or 60%"
          />
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link href={basePath}>
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>

        <Button variant="primary" type="submit" isLoading={isLoading}>
          <Save className="h-4 w-4 mr-1.5" />
          {isEditing ? 'Save Changes' : 'Create Examination Draft'}
        </Button>
      </div>
    </form>
  );
}
