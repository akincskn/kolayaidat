export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 bg-slate-200 rounded mt-1 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-7 w-64 bg-slate-200 rounded" />
          <div className="h-4 w-40 bg-slate-100 rounded" />
        </div>
      </div>

      {[0, 1].map((card) => (
        <div key={card} className="bg-white rounded-xl border p-5 space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-11 bg-slate-200 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="h-12 w-48 bg-slate-200 rounded-md" />
    </div>
  );
}
