'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
} from '@/actions/departments';
import type { Department } from '@/types/database.types';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';

interface DepartmentWithCounts extends Department {
  courseCount?: number;
  instructorCount?: number;
}

interface DepartmentsClientProps {
  initialDepartments: DepartmentWithCounts[];
}

export function DepartmentsClient({ initialDepartments }: DepartmentsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedDept, setSelectedDept] = useState<DepartmentWithCounts | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredDepts = initialDepartments.filter((d) => {
    return (
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Create Department Handler
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setActionError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createDepartment(null, formData);

    setIsLoading(false);
    if (result.error) {
      setActionError(result.error);
    } else {
      setIsCreateModalOpen(false);
      setActionSuccess('Department created successfully.');
      router.refresh();
    }
  }

  // Edit Department Handler
  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedDept) return;

    setIsLoading(true);
    setActionError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateDepartment(selectedDept.id, null, formData);

    setIsLoading(false);
    if (result.error) {
      setActionError(result.error);
    } else {
      setIsEditModalOpen(false);
      setActionSuccess(`Department "${selectedDept.name}" updated successfully.`);
      router.refresh();
    }
  }

  // Toggle Status Handler
  async function handleToggleStatus(dept: Department) {
    setIsLoading(true);
    setActionError(null);

    const result = await toggleDepartmentStatus(dept.id, dept.is_active);
    setIsLoading(false);

    if (result.error) {
      setActionError(result.error);
    } else {
      setActionSuccess(
        `Department "${dept.name}" ${!dept.is_active ? 'activated' : 'deactivated'}.`
      );
      router.refresh();
    }
  }

  // Delete Handler
  async function handleDelete() {
    if (!selectedDept) return;
    setIsLoading(true);
    setActionError(null);

    const result = await deleteDepartment(selectedDept.id);
    setIsLoading(false);

    if (result.error) {
      setActionError(result.error);
    } else {
      setIsDeleteModalOpen(false);
      setActionSuccess(`Department "${selectedDept.name}" removed.`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Departments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure faculties, academic units, and institutional degree programs
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </div>

      {actionSuccess && (
        <Alert type="success" message={actionSuccess} className="mb-4" />
      )}
      {actionError && (
        <Alert type="error" message={actionError} className="mb-4" />
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="w-full sm:w-80 relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search departments by code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-800">{filteredDepts.length}</span> departments
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Department Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Courses</th>
                <th className="py-3 px-4">Faculty</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredDepts.length > 0 ? (
                filteredDepts.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {dept.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {dept.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {dept.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                        {dept.courseCount ?? 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {dept.instructorCount ?? 0} instructors
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={dept.is_active ? 'success' : 'warning'}>
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(dept)}
                          title={dept.is_active ? 'Deactivate department' : 'Activate department'}
                        >
                          {dept.is_active ? (
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
                            setSelectedDept(dept);
                            setIsEditModalOpen(true);
                          }}
                          title="Edit details"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDept(dept);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          title="Delete department"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8">
                    <EmptyState
                      title="No departments found"
                      description="Create your first academic department to establish the curriculum."
                      actionText="Add Department"
                      onAction={() => setIsCreateModalOpen(true)}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Create Department */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Academic Department"
        description="Register a new academic department or university faculty"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Department Code"
            name="code"
            placeholder="e.g. CSE, ECE, CEE"
            helperText="Short unique identifier (capital letters)"
            required
          />

          <Input
            label="Department Name"
            name="name"
            placeholder="e.g. Computer Science & Engineering"
            required
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Outline the scope, specializations, and degree curricula..."
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
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Department */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Academic Department"
        description={`Update information for ${selectedDept?.name}`}
      >
        {selectedDept && (
          <form onSubmit={handleEdit} className="space-y-4">
            <Input
              label="Department Code"
              name="code"
              defaultValue={selectedDept.code}
              required
            />

            <Input
              label="Department Name"
              name="name"
              defaultValue={selectedDept.name}
              required
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={selectedDept.description || ''}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-is-active"
                name="isActive"
                value="true"
                defaultChecked={selectedDept.is_active}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <label htmlFor="edit-is-active" className="text-sm font-medium text-slate-700">
                Department is active (visible to students and faculty)
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

      {/* MODAL: Delete or Deactivate Department */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={
          selectedDept &&
          ((selectedDept.courseCount && selectedDept.courseCount > 0) ||
            (selectedDept.instructorCount && selectedDept.instructorCount > 0))
            ? 'Department Deletion Restricted'
            : 'Delete Academic Department'
        }
        maxWidth="md"
      >
        {selectedDept && (
          <div className="space-y-4">
            {(selectedDept.courseCount && selectedDept.courseCount > 0) ||
            (selectedDept.instructorCount && selectedDept.instructorCount > 0) ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-950">
                      Deletion Blocked by Governance Policy
                    </p>
                    <p className="mt-1 text-amber-800">
                      <strong>{selectedDept.name} ({selectedDept.code})</strong> has active curriculum dependencies:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-amber-900 font-medium">
                      {Boolean(selectedDept.courseCount && selectedDept.courseCount > 0) && (
                        <li>{selectedDept.courseCount} associated course(s)</li>
                      )}
                      {Boolean(selectedDept.instructorCount && selectedDept.instructorCount > 0) && (
                        <li>{selectedDept.instructorCount} assigned instructor(s)</li>
                      )}
                    </ul>
                    <p className="mt-2.5 text-xs text-amber-800">
                      To preserve curriculum integrity, departments with linked records cannot be deleted. You can deactivate the department instead to hide it from students and faculty.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDeleteModalOpen(false)}
                  >
                    Close
                  </Button>
                  {selectedDept.is_active && (
                    <Button
                      type="button"
                      variant="primary"
                      isLoading={isLoading}
                      onClick={async () => {
                        await handleToggleStatus(selectedDept);
                        setIsDeleteModalOpen(false);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Deactivate Department Instead
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-50 rounded-full text-rose-600 shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Are you sure you want to permanently delete{' '}
                    <strong className="text-slate-900">{selectedDept.name}</strong> ({selectedDept.code})?
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    isLoading={isLoading}
                  >
                    Delete Department
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
