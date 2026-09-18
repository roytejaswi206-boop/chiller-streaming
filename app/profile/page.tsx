import Link from "next/link";
import { redirect } from "next/navigation";
import { IconCrown } from "@/components/icons";
import { Sidebar } from "@/components/layout/Sidebar";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_PLANS } from "@/lib/monetization";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      subscriptions: true,
      _count: {
        select: {
          watchlist: true,
          watchHistory: true,
          favorites: true,
        },
      },
    },
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090c]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-4xl overflow-hidden">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Account Profile
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your personal profile and subscription tier
          </p>
        </div>

        {/* User Card */}
        <div className="rounded-2xl border border-white/10 bg-[#121218] p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-rose-600/30">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white">{user?.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-zinc-300">
                  {user?.role}
                </span>
                {user?.tier === "PREMIUM" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <IconCrown className="w-3 h-3" />
                    VIP
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{user?.email}</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "2026"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto">
            <div className="text-center">
              <span className="text-xl font-bold text-white block">{user?._count.watchlist || 0}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Watchlist</span>
            </div>
            <div className="text-center">
              <span className="text-xl font-bold text-white block">{user?._count.watchHistory || 0}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">History</span>
            </div>
            <div className="text-center">
              <span className="text-xl font-bold text-white block">{user?._count.favorites || 0}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Favorites</span>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight mb-4">
            Membership Plans
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between ${
                  plan.id === "PREMIUM_MONTHLY"
                    ? "border-[#FF3864] bg-gradient-to-b from-[#1c1420] to-[#121218] shadow-xl shadow-rose-600/10"
                    : "border-white/10 bg-[#121218]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                    {plan.id !== "FREE" && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#FF3864]/20 text-rose-300">
                        HD+
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-black text-white">
                      ${plan.price}
                    </span>
                    <span className="text-xs text-zinc-400 ml-1">
                      /{plan.interval}
                    </span>
                  </div>

                  <ul className="space-y-2 text-xs text-zinc-300 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold shrink-0">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-center transition ${
                    plan.id === "FREE"
                      ? "border border-white/10 bg-white/5 text-zinc-400"
                      : "chiller-gradient text-white shadow-md shadow-rose-600/30 opacity-80"
                  }`}
                >
                  {plan.id === "FREE" ? "Current Plan" : "Upgrade (Future)"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
