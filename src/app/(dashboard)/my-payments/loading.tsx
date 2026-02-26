export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-slate-200 rounded" />
        <div className="h-4 w-56 bg-slate-100 rounded" />
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
