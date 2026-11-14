'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  assignInstructorToDepartment,
  removeInstructorFromDepartment,
} from '@/actions/instructors';
import type { Profile, Department } from '@/types/database.types';
import {
  UserCheck,
  Plus,
  Trash2,
  Building2,
  Search,
  GraduationCap,
  Mail,
  Filter,
} from 'lucide-react';

interface AssignmentRow {
  id: string;
  instructor_id: string;
  department_id: string;
  created_at: string;
  instructor: Profile;
  department: Department;
}

interface InstructorsClientProps {
  assignments: AssignmentRow[];
  instructors: Profile[];
  departments: Department[];
}

export function InstructorsClient({
  assignments,
  instructors,
  departments,
}: InstructorsClientProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentRow | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.instructor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.instructor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'all' || a.department_id === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const instructorOptions = instructors.map((i) => ({
    value: i.id,
    label: `${i.full_name} (${i.email})`,
  }));

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: `${d.code} — ${d.name}`,
  }));

  // Handle Assign
  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedInstructorId || !selectedDepartmentId) {
      setActionError('Please select both an instructor and a department.');
      return;
    }

    setIsLoading(true);
    setActionError(null);

    const result = await assignInstructorToDepartment(selectedInstructorId, selectedDepartmentId);

    setIsLoading(false);
    if (result.error) {
      setActionError(result.error);
    } else {
      setIsAssignModalOpen(false);
      setSelectedInstructorId('');
      setSelectedDepartmentId('');
      setActionSuccess('Instructor successfully assigned to department.');
      router.refresh();
    }
  }

  // Handle Remove
  async function handleRemove() {
    if (!selectedAssignment) return;
    setIsLoading(true);
    setActionError(null);

    const result = await removeInstructorFromDepartment(
      selectedAssignment.instructor_id,
      selectedAssignment.department_id
    );

    setIsLoading(false);
    if (result.error) {
      setActionError(result.error);
    } else {
      setIsDeleteModalOpen(false);
      setActionSuccess(
        `Assignment of ${selectedAssignment.instructor.full_name} from ${selectedAssignment.department.name} removed.`
      );
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Instructor Department Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pair faculty instructors to multiple university departments to grant course authoring and exam management authority
          </p>
        </div>
        <Button onClick={() => setIsAssignModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Assign Instructor
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
            placeholder="Search instructor or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
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

      {/* Assignments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Instructor Faculty</th>
                <th className="py-3 px-4">Assigned Department</th>
                <th className="py-3 px-4">Faculty Status</th>
                <th className="py-3 px-4">Assignment Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{a.instructor.full_name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" />
                        {a.instructor.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {a.department.code}
                        </span>
                        <span className="font-medium text-slate-800">{a.department.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={a.instructor.account_status} />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAssignment(a);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        title="Remove Assignment"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs">Remove</span>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState
                      title="No assignments recorded"
                      description="Assign university instructors to departments so they can oversee departmental courses and exams."
                      actionText="Assign Instructor"
                      onAction={() => setIsAssignModalOpen(true)}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Assign Instructor */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Instructor to Department"
        description="Pair an instructor with an academic department"
      >
        <form onSubmit={handleAssign} className="space-y-4">
          <Select
            label="Select Instructor"
            value={selectedInstructorId}
            onChange={(e) => setSelectedInstructorId(e.target.value)}
            options={instructorOptions}
            placeholder="Choose instructor faculty member"
            required
          />

          <Select
            label="Academic Department"
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            options={departmentOptions}
            placeholder="Choose academic department to assign"
            required
          />

          <p className="text-xs text-slate-500">
            Note: Instructors may be assigned to multiple academic departments simultaneously.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM: Remove Assignment */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleRemove}
        title="Remove Instructor Department Assignment"
        message={`Are you sure you want to remove "${selectedAssignment?.instructor.full_name}" from "${selectedAssignment?.department.name}"? The instructor will no longer have access to this department's courses.`}
        confirmText="Remove Assignment"
        isDestructive
        isLoading={isLoading}
      />
    </div>
  );
}
