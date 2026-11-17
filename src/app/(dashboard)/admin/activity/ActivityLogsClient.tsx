'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AdminActivityLog } from '@/types/database.types';
import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  User,
  Building2,
  BookOpen,
  UserCheck,
  Clock,
  Shield,
} from 'lucide-react';

interface ActivityLogsClientProps {
  logs: AdminActivityLog[];
}

export function ActivityLogsClient({ logs }: ActivityLogsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const [selectedLog, setSelectedLog] = useState<AdminActivityLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const detailsStr = JSON.stringify(log.details || {}).toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      log.admin_name.toLowerCase().includes(query) ||
      log.admin_email.toLowerCase().includes(query) ||
      log.action_type.toLowerCase().includes(query) ||
      log.entity_type.toLowerCase().includes(query) ||
      detailsStr.includes(query);

    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'user':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'department':
        return <Building2 className="h-4 w-4 text-emerald-600" />;
      case 'course':
        return <BookOpen className="h-4 w-4 text-purple-600" />;
      case 'instructor_assignment':
        return <UserCheck className="h-4 w-4 text-amber-600" />;
      default:
        return <Shield className="h-4 w-4 text-slate-500" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    if (actionType.includes('delete') || actionType.includes('remove') || actionType.includes('suspend')) {
      return <Badge variant="danger">{actionType.replace('_', ' ')}</Badge>;
    }
    if (actionType.includes('create') || actionType.includes('assign') || actionType.includes('activate')) {
      return <Badge variant="success">{actionType.replace('_', ' ')}</Badge>;
    }
    if (actionType.includes('deactivate')) {
      return <Badge variant="warning">{actionType.replace('_', ' ')}</Badge>;
    }
    return <Badge variant="info">{actionType.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administrative Activity Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable, cryptographic audit trail of all governance operations across ExitExam Prep
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
          <Shield className="h-4 w-4 text-emerald-600" />
          Audit Protection Active
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by admin, action, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap w-full md:w-auto items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Entities</option>
            <option value="user">Users</option>
            <option value="department">Departments</option>
            <option value="course">Courses</option>
            <option value="instructor_assignment">Instructor Pairings</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Actions</option>
            <option value="user_create">User Create</option>
            <option value="user_update">User Update</option>
            <option value="user_role_change">Role Change</option>
            <option value="user_status_change">Status Change</option>
            <option value="user_delete">User Delete</option>
            <option value="department_create">Department Create</option>
            <option value="department_update">Department Update</option>
            <option value="department_activate">Department Activate</option>
            <option value="department_deactivate">Department Deactivate</option>
            <option value="department_delete">Department Delete</option>
            <option value="course_create">Course Create</option>
            <option value="course_update">Course Update</option>
            <option value="course_activate">Course Activate</option>
            <option value="course_deactivate">Course Deactivate</option>
            <option value="course_delete">Course Delete</option>
            <option value="instructor_assign">Instructor Assign</option>
            <option value="instructor_remove">Instructor Remove</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Overview</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const detailsObj = (log.details as Record<string, unknown>) || {};
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {new Date(log.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{log.admin_name}</div>
                        <div className="text-[11px] text-slate-500">{log.admin_email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getActionBadge(log.action_type)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 capitalize">
                          {getEntityIcon(log.entity_type)}
                          <span>{log.entity_type.replace('_', ' ')}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {detailsObj.targetUserEmail ? (
                          <span>Target: <strong>{String(detailsObj.targetUserEmail)}</strong></span>
                        ) : detailsObj.name ? (
                          <span>Dept: <strong>{String(detailsObj.name)}</strong> ({String(detailsObj.code || '')})</span>
                        ) : detailsObj.title ? (
                          <span>Course: <strong>{String(detailsObj.code)}</strong> — {String(detailsObj.title)}</span>
                        ) : detailsObj.instructorName ? (
                          <span>Instructor: <strong>{String(detailsObj.instructorName)}</strong></span>
                        ) : detailsObj.deletedDepartmentName ? (
                          <span>Deleted: <strong>{String(detailsObj.deletedDepartmentName)}</strong></span>
                        ) : detailsObj.deletedUserEmail ? (
                          <span>Deleted: <strong>{String(detailsObj.deletedUserEmail)}</strong></span>
                        ) : detailsObj.courseCode ? (
                          <span>Course: <strong>{String(detailsObj.courseCode)}</strong></span>
                        ) : (
                          <span>Entity ID: {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '—'}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDetailModalOpen(true);
                          }}
                          title="Inspect audit payload"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">View</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState
                      title="No activity logs found"
                      description="No administrative actions match your current search or filter criteria."
                      icon={<ClipboardList className="h-6 w-6" />}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL: Activity Log Payload */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Audit Log Details"
        description={`Record ID: ${selectedLog?.id}`}
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Actor Admin:</span>
                <span className="font-semibold text-slate-800">{selectedLog.admin_name}</span>
                <span className="block text-slate-500">{selectedLog.admin_email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Timestamp:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Action Type:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedLog.action_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Target Entity:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {selectedLog.entity_type} {selectedLog.entity_id ? `(${selectedLog.entity_id})` : ''}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Audit Payload (Non-Sensitive Context)
              </label>
              <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto max-h-64 leading-relaxed border border-slate-800">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
