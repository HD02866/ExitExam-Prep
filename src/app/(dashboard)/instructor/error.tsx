'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface InstructorErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function InstructorError({ error, reset }: InstructorErrorProps) {
  useEffect(() => {
    console.error('Instructor route error boundary captured:', error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-rose-100 shadow-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900">
            Unable to Load Instructor Portal
          </h2>
          <p className="text-sm text-slate-600">
            An error occurred while loading your assigned departments or courses. If your account was recently modified, please refresh.
          </p>
        </div>

        {error.message && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left">
            <p className="text-xs font-mono text-slate-700 break-words">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/instructor'}
          >
            Dashboard Home
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => reset()}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
