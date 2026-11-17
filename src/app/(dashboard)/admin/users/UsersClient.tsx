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
  createStaffAccount,
  updateUserAccount,
  updateUserRole,
  updateUserStatus,
  deleteUserAccount,
} from '@/actions/users';
import type { Profile, Department, UserRole, AccountStatus } from '@/types/database.types';
import {
  UserPlus,
  Shield,
  Trash2,
  Filter,
  Search,
  Check,
  Ban,
  UserCheck,
  Pencil,
  AlertTriangle,
  User,
} from 'lucide-react';

interface UsersClientProps {
  initialProfiles: (Profile & { department?: { name: string; code: string } | null })[];
  departments: Department[];
  currentAdminId: string;
}

export function UsersClient({ initialProfiles, departments, currentAdminId }: UsersClientProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('instructor');
  const [newStatus, setNewStatus] = useState<AccountStatus>('active');

  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filtered users
  const filteredUsers = initialProfiles.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department?.code && u.department.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.department?.name && u.department.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.account_status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle Create User
  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setActionError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createStaffAccount(null, formData);

    setIsLoading(false);
    if (result.error) {
      setActionError(result.error);
    } else {
      setIsCreateModalOpen(false);
      setActionSuccess('Account successfully provisioned.');
      router.refresh();
    }
  }

  // Handle Edit User (Full Name & Department)
  async function handleEditUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUser) return;

    setIsLoading(true);
    setActionError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateUserAccount(selectedUser.id, formData);

    setIsLoading(false);
    if (result.error) {
      setActionError(result.error);
    } else {
      setIsEditModalOpen(false);
      setActionSuccess(`User "${selectedUser.full_name}" updated successfully.`);
      router.refresh();
    }
  }

  // Handle Update Role
  async function handleUpdateRole() {
    if (!selectedUser) return;
    setIsLoading(true);
    setActionError(null);

    const result = await updateUserRole(selectedUser.id, newRole);
    setIsLoading(false);

    if (result.error) {
      setActionError(result.error);
    } else {
      setIsRoleModalOpen(false);
      setActionSuccess(`Role for ${selectedUser.full_name} updated to ${newRole}.`);
      router.refresh();
    }
  }

  // Handle Update Status
  async function handleUpdateStatus() {
    if (!selectedUser) return;
    setIsLoading(true);
    setActionError(null);

    const result = await updateUserStatus(selectedUser.id, newStatus);
    setIsLoading(false);

    if (result.error) {
      setActionError(result.error);
    } else {
      setIsStatusModalOpen(false);
      setActionSuccess(`Status for ${selectedUser.full_name} updated to ${newStatus}.`);
      router.refresh();
    }
  }

  // Handle Delete
  async function handleDeleteUser() {
    if (!selectedUser) return;
    setIsLoading(true);
    setActionError(null);

    const result = await deleteUserAccount(selectedUser.id);
    setIsLoading(false);

    if (result.error) {
      setActionError(result.error);
    } else {
      setIsDeleteModalOpen(false);
      setActionSuccess(`Account for ${selectedUser.full_name} permanently removed.`);
      router.refresh();
    }
  }

  const deptOptions = departments.map((d) => ({
    value: d.id,
    label: `${d.code} — ${d.name}`,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Account Governance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Provision faculty accounts, edit student profiles, assign roles, and audit account statuses
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Provision Account
        </Button>
      </div>

      {actionSuccess && (
        <Alert type="success" message={actionSuccess} className="mb-4" />
      )}
      {actionError && (
        <Alert type="error" message={actionError} className="mb-4" />
      )}

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-72 relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          />
        </div>

        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="instructor">Instructors</option>
            <option value="student">Students</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isCurrentAdmin = user.id === currentAdminId;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{user.full_name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge role={user.role} />
                      </td>
                      <td className="py-3.5 px-4">
                        {user.department ? (
                          <span className="text-xs font-medium text-slate-700">
                            {user.department.code} — {user.department.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={user.account_status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isCurrentAdmin ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                            <User className="h-3 w-3 text-slate-500" />
                            You (Current Admin)
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditModalOpen(true);
                              }}
                              title="Edit user details"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline text-xs">Edit</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRole(user.role);
                                setIsRoleModalOpen(true);
                              }}
                              title="Change Role"
                            >
                              <Shield className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline text-xs">Role</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewStatus(user.account_status);
                                setIsStatusModalOpen(true);
                              }}
                              title="Update Status"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline text-xs">Status</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDeleteModalOpen(true);
                              }}
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              title="Delete Account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState
                      title="No accounts found"
                      description="No user accounts match the current filter criteria."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Provision Account */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision University Account"
        description="Create an authorized instructor or administrative user profile"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Legal Name"
            name="fullName"
            placeholder="e.g. Prof. Dawit Haile"
            required
          />

          <Input
            label="Institutional Email"
            name="email"
            type="email"
            placeholder="instructor@university.edu"
            required
          />

          <Input
            label="Temporary Password"
            name="password"
            type="password"
            placeholder="Minimum 6 characters"
            required
          />

          <Select
            label="Assigned System Role"
            name="role"
            defaultValue="instructor"
            options={[
              { value: 'instructor', label: 'Instructor (Academic Faculty)' },
              { value: 'student', label: 'Student' },
              { value: 'admin', label: 'Admin (Platform Governance)' },
            ]}
            required
          />

          <Select
            label="Primary Department"
            name="departmentId"
            options={deptOptions}
            placeholder="Assign primary academic department"
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit User Details */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User Details"
        description={`Modify information for ${selectedUser?.email}`}
        maxWidth="md"
      >
        {selectedUser && (
          <form onSubmit={handleEditUser} className="space-y-4">
            <Input
              label="Full Legal Name"
              name="fullName"
              defaultValue={selectedUser.full_name}
              required
            />

            <Input
              label="University Email (Read-Only)"
              name="email"
              defaultValue={selectedUser.email}
              disabled
              helperText="Email addresses are linked to Supabase Auth identity"
            />

            <Select
              label="Assigned Academic Department"
              name="departmentId"
              defaultValue={selectedUser.department_id || ''}
              options={deptOptions}
              placeholder="Select department (optional)"
            />

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

      {/* MODAL: Change Role with Confirmation */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Modify User Role"
        description={`Alter authority level for ${selectedUser?.full_name}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Select
            label="Select Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            options={[
              { value: 'student', label: 'Student (Undergraduate prep)' },
              { value: 'instructor', label: 'Instructor (Academic Faculty)' },
              { value: 'admin', label: 'Admin (Platform Governance)' },
            ]}
          />

          {newRole === 'admin' && (
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <span>
                <strong>Elevated Privilege Notice:</strong> Granting Admin role gives this user full platform-wide governance permissions.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateRole} isLoading={isLoading}>
              Confirm Role Change
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Change Status with Confirmation */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Account Status"
        description={`Set access state for ${selectedUser?.full_name}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Select
            label="Account Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as AccountStatus)}
            options={[
              { value: 'active', label: 'Active (Allowed access)' },
              { value: 'inactive', label: 'Inactive (Login disabled)' },
              { value: 'suspended', label: 'Suspended (Access blocked)' },
            ]}
          />

          {newStatus !== 'active' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                This user will be immediately logged out and blocked from signing in until an administrator reactivates the account.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={newStatus === 'active' ? 'primary' : 'danger'}
              onClick={handleUpdateStatus}
              isLoading={isLoading}
            >
              Confirm Status Change
            </Button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM: Delete Account */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User Account"
        message={`Are you sure you want to permanently remove "${selectedUser?.full_name}" (${selectedUser?.email})? All associated records will be deleted from Supabase Auth and database tables.`}
        confirmText="Delete Account"
        isDestructive
        isLoading={isLoading}
      />
    </div>
  );
}
