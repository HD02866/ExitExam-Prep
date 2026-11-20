export default function InstructorExamsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-7 w-64 bg-slate-200 rounded-lg" />
          <div className="h-4 w-96 bg-slate-100 rounded-lg mt-2" />
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-6 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      <div className="h-16 bg-white rounded-xl border border-slate-200" />

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
        ))}
      </div>
    </div>
  );
}
