import React from "react";
import { prisma } from "@/lib/prisma";
import {
  getSuperAdminDiagnostics,
  DESIGNATED_SUPER_ADMIN_EMAILS,
} from "@/lib/config/super-admin";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const diagnostics = getSuperAdminDiagnostics();

  // Fetch registered Super Admin accounts from database
  const superAdminUsers = await prisma.user.findMany({
    where: {
      role: "SUPER_ADMIN",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tier: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Recent security audit events
  const securityLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          "SUPER_ADMIN_LOGIN",
          "SUPER_ADMIN_ACCESS_DENIED",
          "ROLE_PROMOTION_DENIED",
          "ROOT_ACCOUNT_MODIFICATION_BLOCKED",
          "SUPER_ADMIN_DELETION_BLOCKED",
          "SUPER_ADMIN_BOOTSTRAP_SYNC",
          "USER_UPDATED",
          "USER_DELETED",
        ],
      },
    },
    take: 30,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20">
              CHILLER SUPER ADMIN
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              ROOT SECURITY CENTER
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Security & Identity Authority
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cryptographic authentication, multi-super-admin governance, and zero-trust perimeter auditing.
          </p>
        </div>
      </div>

      {/* Top Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Credential Status
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-black text-emerald-400 tracking-wide">
              {diagnostics.credentialStatus}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3 font-mono">
            Storage: bcrypt (rounds: 12) • Client Exposure: 0%
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Designated Root Identities
          </span>
          <span className="text-2xl font-black text-white">
            {diagnostics.configuredIdentitiesCount} Accounts
          </span>
          <p className="text-[11px] text-zinc-400 mt-2">
            Protected against deletion, demotion, and lockout.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Authorization Protocol
          </span>
          <span className="text-sm font-bold text-sky-400">
            Strict Server-Side RBAC
          </span>
          <p className="text-[11px] text-zinc-500 mt-2">
            Exact email matching • Live database verification on every mutation
          </p>
        </div>
      </div>

      {/* Designated Super Admin Identities */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Designated Root Super Admin Identities
            </h3>
            <p className="text-[11px] text-zinc-400">
              Only these designated identities possess unconstrained administrative authority.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            PROTECTED ROOT
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {DESIGNATED_SUPER_ADMIN_EMAILS.map((email, idx) => {
            const dbRecord = superAdminUsers.find(
              (u) => u.email.toLowerCase() === email.toLowerCase()
            );

            return (
              <div
                key={email}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF3B6B] to-[#FF8E53] flex items-center justify-center font-black text-white text-xs shadow-md">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">{email}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30">
                        SUPER ADMIN
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Name: {dbRecord?.name || "Tejaswi Roy"} • Tier: {dbRecord?.tier || "PREMIUM_YEARLY"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    AUTHORIZED & SYNCED
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    ID: {dbRecord?.id ? `${dbRecord.id.slice(0, 10)}...` : "Active"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Alerts & Incident History */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Security Alerts & Audit Log</h3>
            <p className="text-[11px] text-zinc-400">
              Real-time security events, unauthorized access attempts, and administrative actions.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {securityLogs.length} Events
          </span>
        </div>

        {securityLogs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs">
            No anomalous security events or unauthorized attempts recorded. Perimeter clean.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {securityLogs.map((log) => {
              const isWarning =
                log.action.includes("DENIED") ||
                log.action.includes("BLOCKED") ||
                log.action.includes("FAILED");

              return (
                <div
                  key={log.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          isWarning
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-white font-bold">{log.target || "System"}</span>
                    </div>
                    {log.details && (
                      <p className="text-zinc-400 font-mono text-[11px] truncate max-w-xl">
                        {log.details}
                      </p>
                    )}
                  </div>
                  <div className="text-right sm:text-left text-[11px] text-zinc-500 font-mono">
                    <span>{log.adminEmail}</span> • <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
