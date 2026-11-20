export default function AdminExamDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 rounded" />
      <div className="h-44 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded-full" />
        <div className="h-8 w-96 bg-slate-300 rounded" />
        <div className="h-4 w-full max-w-xl bg-slate-100 rounded" />
      </div>
      <div className="h-12 border-b border-slate-200" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 bg-white rounded-xl border border-slate-200" />
        ))}
      </div>
    </div>
  );
}
