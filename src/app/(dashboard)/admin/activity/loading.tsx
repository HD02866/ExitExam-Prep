import React from 'react';

export default function ActivityLogsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 rounded-md" />
          <div className="h-4 w-80 bg-slate-100 rounded-md" />
        </div>
        <div className="h-8 w-24 bg-slate-200 rounded-full" />
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="h-9 w-full sm:w-80 bg-slate-100 rounded-lg" />
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="h-9 w-32 bg-slate-100 rounded-lg" />
          <div className="h-9 w-32 bg-slate-100 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="h-10 bg-slate-50 rounded-lg" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-14 bg-slate-50/60 rounded-lg border border-slate-100"
          />
        ))}
      </div>
    </div>
  );
}
