export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-slate-200 rounded shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-7 w-40 bg-slate-200 rounded" />
          <div className="h-4 w-48 bg-slate-100 rounded" />
        </div>
      </div>

      <div className="h-32 bg-slate-200 rounded-lg" />

      <div className="space-y-2">
        <div className="h-6 w-24 bg-slate-200 rounded mb-3" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
