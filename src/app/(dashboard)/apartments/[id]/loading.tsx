export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 bg-slate-200 rounded mt-1 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-7 w-52 bg-slate-200 rounded" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="h-16 flex-1 min-w-[140px] bg-slate-200 rounded-lg" />
        <div className="h-16 flex-1 min-w-[140px] bg-slate-200 rounded-lg" />
        <div className="h-9 w-36 bg-slate-100 rounded-md self-center" />
        <div className="h-9 w-28 bg-slate-100 rounded-md self-center" />
      </div>

      <div className="space-y-2">
        <div className="h-6 w-20 bg-slate-200 rounded mb-3" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-slate-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
