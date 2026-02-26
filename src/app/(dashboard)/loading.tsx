export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded" />
      <div className="h-4 w-72 bg-slate-100 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3 mt-2">
        <div className="h-20 bg-slate-200 rounded-lg" />
        <div className="h-20 bg-slate-200 rounded-lg" />
        <div className="h-20 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}
