import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./_components/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Profil</h1>
        <p className="text-slate-500 text-sm">Hesap bilgilerinizi yönetin</p>
      </div>
      <ProfileForm user={user} />
    </div>
  );
}
