import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileAccountCenter } from "@/components/profile/ProfileAccountCenter";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getAuthSession();

  let user = null;
  if (session?.user?.email) {
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
          _count: {
            select: {
              watchlist: true,
              watchHistory: true,
              favorites: true,
            },
          },
        },
      });
    } catch {
      // Graceful fallback if database read fails
    }
  }

  const isSuperAdmin = session?.user?.email
    ? session.user.email === "roytejaswi40@gmail.com" || session.user.email === "roytejaswi206@gmail.com" || (session.user as any).role === "SUPER_ADMIN"
    : false;
  const isAdsFree = isSuperAdmin || Boolean((session?.user as any)?.adsFree) || Boolean(user?.adsFree);

  const userData = user
    ? {
        name: user.name,
        email: user.email,
        role: isSuperAdmin ? "SUPER_ADMIN" : user.role,
        adsFree: isAdsFree,
        createdAt: user.createdAt,
        stats: {
          watchlistCount: user._count.watchlist || 0,
          historyCount: user._count.watchHistory || 0,
          continueWatchingCount: Math.min(user._count.watchHistory || 0, 12),
        },
      }
    : {
        name: session?.user?.name || "Guest Explorer",
        email: session?.user?.email || "Guest (Local Storage)",
        role: isSuperAdmin ? "SUPER_ADMIN" : "GUEST",
        adsFree: isAdsFree,
        createdAt: new Date(),
        stats: {
          watchlistCount: 0,
          historyCount: 0,
          continueWatchingCount: 0,
        },
      };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-5xl overflow-hidden">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Account Center
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Manage your personal profile, playback settings, and audio preferences
          </p>
        </div>

        <ProfileAccountCenter user={userData} />
      </main>
    </div>
  );
}
