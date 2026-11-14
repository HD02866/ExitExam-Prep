'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { updateStudentDepartment } from '@/actions/auth';
import type { Department, Course } from '@/types/database.types';
import {
  Building2,
  BookOpen,
  CheckCircle,
  Search,
  Check,
  Star,
} from 'lucide-react';

interface DepartmentWithCourses extends Department {
  courses: Course[];
}

interface StudentDepartmentsClientProps {
  departments: DepartmentWithCourses[];
  currentDepartmentId: string | null;
}

export function StudentDepartmentsClient({
  departments,
  currentDepartmentId,
}: StudentDepartmentsClientProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeDeptId, setActiveDeptId] = useState<string | null>(currentDepartmentId);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredDepts = departments.filter((dept) => {
    const matchesDept =
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = dept.courses.some(
      (c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesDept || matchesCourse;
  });

  async function handleSelectDepartment(departmentId: string, departmentName: string) {
    setIsLoading(departmentId);
    setMessage(null);

    const result = await updateStudentDepartment(departmentId);

    setIsLoading(null);
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setActiveDeptId(departmentId);
      setMessage({
        type: 'success',
        text: `Your primary department has been set to "${departmentName}".`,
      });
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">University Departments & Courses</h1>
        <p className="text-sm text-slate-500 mt-1">
          Browse academic departments, inspect curriculum courses, and select your declared major
        </p>
      </div>

      {message && (
        <Alert
          type={message.type}
          message={message.text}
          className="mb-4"
        />
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="w-full sm:w-80 relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by department or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {departments.length} Active Departments
        </span>
      </div>

      {/* Departments Accordion / Cards */}
      <div className="space-y-6">
        {filteredDepts.length > 0 ? (
          filteredDepts.map((dept) => {
            const isSelected = activeDeptId === dept.id;
            return (
              <div
                key={dept.id}
                className={`bg-white rounded-2xl border shadow-xs overflow-hidden transition-all ${
                  isSelected ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'
                }`}
              >
                {/* Department Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {dept.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">{dept.name}</h2>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                            <Star className="h-3 w-3 fill-emerald-600" /> Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                        {dept.description || 'Comprehensive exit examination preparation curriculum.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <Button variant="outline" size="sm" disabled className="bg-emerald-50 text-emerald-800 border-emerald-200">
                        <Check className="h-4 w-4 mr-1 text-emerald-600" /> Your Department
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isLoading === dept.id}
                        onClick={() => handleSelectDepartment(dept.id, dept.name)}
                      >
                        Set as My Department
                      </Button>
                    )}
                  </div>
                </div>

                {/* Courses in Department */}
                <div className="p-6 bg-slate-50/40">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Department Courses ({dept.courses.length})
                  </h3>

                  {dept.courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dept.courses.map((course) => (
                        <div
                          key={course.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                {course.code}
                              </span>
                              <Badge variant="success">Active</Badge>
                            </div>
                            <h4 className="font-semibold text-slate-900 text-sm">{course.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {course.description || 'Exit exam module.'}
                            </p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                            Course Code: {course.code}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed border-slate-200 bg-white text-center text-xs text-slate-500">
                      No active courses registered for this department yet.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-900">No departments match your search</h3>
            <p className="text-xs text-slate-500 mt-1">Try searching with a different course code or keyword.</p>
          </div>
        )}
      </div>
    </div>
  );
}
