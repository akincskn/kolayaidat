export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 bg-slate-200 rounded mt-1 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-7 w-72 bg-slate-200 rounded" />
          <div className="h-4 w-40 bg-slate-100 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-xl" />
        ))}
      </div>

      <div className="h-20 bg-slate-200 rounded-xl" />
      <div className="h-28 bg-slate-200 rounded-xl" />

      <div className="space-y-2">
        <div className="h-6 w-40 bg-slate-200 rounded mb-3" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-slate-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
