export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-slate-200 rounded" />
        <div className="h-5 w-48 bg-slate-100 rounded" />
      </div>

      {/* Month tabs */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 w-28 bg-slate-200 rounded-lg" />
        ))}
      </div>

      {/* Due info */}
      <div className="h-24 bg-slate-200 rounded-xl" />

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="h-12 bg-slate-100 border-b" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 border-b bg-white px-5 py-3">
            <div className="h-5 w-full bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
