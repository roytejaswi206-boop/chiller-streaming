import React from "react";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/security/rbac";
import { UserManagementTable } from "@/components/admin/UserManagementTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, authCtx] = await Promise.all([
    prisma.user.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
        adsFree: true,
        mustChangePassword: true,
        createdAt: true,
        _count: {
          select: {
            watchlist: true,
            watchHistory: true,
          },
        },
      },
    }),
    getAuthContext(),
  ]);

  return (
    <div className="space-y-8">
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
              CHILLER SUPER ADMIN
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 border border-sky-500/20">
              IDENTITY GOVERNANCE
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            User & Identity Authority
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Inspect registered accounts, assign administrative roles, manage subscription tiers, and enforce root account protections.
          </p>
        </div>
      </div>

      <UserManagementTable
        initialUsers={users}
        currentUserEmail={authCtx?.email || ""}
      />
    </div>
  );
}
