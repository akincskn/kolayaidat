export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">KolayAidat</h1>
          <p className="text-slate-500 mt-1">Apartman aidat yönetimi</p>
        </div>
        {children}
      </div>
    </div>
  );
}
