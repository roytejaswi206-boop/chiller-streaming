import React from "react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          watchlist: true,
          watchHistory: true,
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div className="border-b border-white/10 pb-6">
        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20">
          Account Governance
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight mt-1">
          User & Identity Management
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Inspect registered accounts, assign roles, view watchlist volume, and audit activity.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>Registered Accounts ({users.length} Users)</span>
          <span>Role & Activity</span>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            No registered users found in the database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Watchlist</th>
                  <th className="py-3 px-4">History</th>
                  <th className="py-3 px-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{u.name || "Nameless User"}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          u.role === "ADMIN"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-white/5 text-zinc-400"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">{u.tier}</td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{u._count.watchlist}</td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{u._count.watchHistory}</td>
                    <td className="py-3 px-4 text-zinc-500 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
