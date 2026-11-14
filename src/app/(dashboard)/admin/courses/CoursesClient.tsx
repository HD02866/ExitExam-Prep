'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  createCourse,
  updateCourse,
  toggleCourseStatus,
  deleteCourse,
} from '@/actions/courses';
import type { Course, Department } from '@/types/database.types';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Building2,
  Filter,
} from 'lucide-react';

interface CourseWithDepartment extends Course {
  department?: Department | null;
}

interface CoursesClientProps {
  initialCourses: CourseWithDepartment[];
  departments: Department[];
}

export function CoursesClient({ initialCourses, departments }: CoursesClientProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredCourses = initialCourses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = selectedDeptFilter === 'all' || course.department_id === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  const deptOptions = departments.map((d) => ({
    value: d.id,
    label: `${d.code} — ${d.name}`,
  }));

  // Create Course Handler
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setActionError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createCourse(null, formData);

    setIsLoading(false);
    if (result.error) {
      setActionError(result.error);
    } else {
      setIsCreateModalOpen(false);
      setActionSuccess('Course created successfully.');
      router.refresh();
    }
  }

  // Edit Course Handler
  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedCourse) return;

    setIsLoading(true);
    setActionError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateCourse(selectedCourse.id, null, formData);

    setIsLoading(false);
    if (result.error) {
      setActionError(result.error);
    } else {
      setIsEditModalOpen(false);
      setActionSuccess(`Course "${selectedCourse.code}" updated successfully.`);
      router.refresh();
    }
  }

  // Toggle Status Handler
  async function handleToggleStatus(course: Course) {
    setIsLoading(true);
    setActionError(null);

    const result = await toggleCourseStatus(course.id, course.is_active);
    setIsLoading(false);

    if (result.error) {
      setActionError(result.error);
    } else {
      setActionSuccess(
        `Course "${course.code}" ${!course.is_active ? 'activated' : 'deactivated'}.`
      );
      router.refresh();
    }
  }

  // Delete Handler
  async function handleDelete() {
    if (!selectedCourse) return;
    setIsLoading(true);
    setActionError(null);

    const result = await deleteCourse(selectedCourse.id);
    setIsLoading(false);

    if (result.error) {
      setActionError(result.error);
    } else {
      setIsDeleteModalOpen(false);
      setActionSuccess(`Course "${selectedCourse.code}" deleted.`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Curriculum Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and organize exit-tested courses assigned to university departments
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      {actionSuccess && (
        <Alert type="success" message={actionSuccess} className="mb-4" />
      )}
      {actionError && (
        <Alert type="error" message={actionError} className="mb-4" />
      )}

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80 relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by course code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="w-full sm:w-64 text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Departments ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Course Code</th>
                <th className="py-3 px-4">Course Title</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {course.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {course.title}
                    </td>
                    <td className="py-3.5 px-4">
                      {course.department ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{course.department.code}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {course.description || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={course.is_active ? 'success' : 'warning'}>
                        {course.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(course)}
                          title={course.is_active ? 'Deactivate course' : 'Activate course'}
                        >
                          {course.is_active ? (
                            <>
                              <XCircle className="h-3.5 w-3.5 text-amber-600" />
                              <span className="hidden lg:inline text-xs">Deactivate</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="hidden lg:inline text-xs">Activate</span>
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCourse(course);
                            setIsEditModalOpen(true);
                          }}
                          title="Edit course"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCourse(course);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          title="Delete course"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState
                      title="No courses found"
                      description="Add courses belonging to academic departments."
                      actionText="Add Course"
                      onAction={() => setIsCreateModalOpen(true)}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Create Course */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Academic Course"
        description="Add a curriculum course belonging to a university department"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Academic Department"
            name="departmentId"
            options={deptOptions}
            placeholder="Select belonging department"
            required
          />

          <Input
            label="Course Code"
            name="code"
            placeholder="e.g. CSE301, ECE204"
            helperText="Course code must be unique within its department"
            required
          />

          <Input
            label="Course Title"
            name="title"
            placeholder="e.g. Data Structures & Algorithms"
            required
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Syllabus scope and exit examination focus..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Create Course
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Course */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Course"
        description={`Update course ${selectedCourse?.code}`}
      >
        {selectedCourse && (
          <form onSubmit={handleEdit} className="space-y-4">
            <Select
              label="Academic Department"
              name="departmentId"
              defaultValue={selectedCourse.department_id}
              options={deptOptions}
              required
            />

            <Input
              label="Course Code"
              name="code"
              defaultValue={selectedCourse.code}
              required
            />

            <Input
              label="Course Title"
              name="title"
              defaultValue={selectedCourse.title}
              required
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={selectedCourse.description || ''}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-course-active"
                name="isActive"
                value="true"
                defaultChecked={selectedCourse.is_active}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <label htmlFor="edit-course-active" className="text-sm font-medium text-slate-700">
                Course is active (available for student preparation)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* CONFIRM: Delete Course */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Course"
        message={`Are you sure you want to permanently delete course "${selectedCourse?.code} — ${selectedCourse?.title}"?`}
        confirmText="Delete Course"
        isDestructive
        isLoading={isLoading}
      />
    </div>
  );
}
