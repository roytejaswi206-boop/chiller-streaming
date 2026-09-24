"use client";

import React, { useState } from "react";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  tier: string;
  mustChangePassword: boolean;
  createdAt: string | Date;
  _count?: {
    watchlist: number;
    watchHistory: number;
  };
}

interface UserManagementTableProps {
  initialUsers: UserItem[];
  currentUserEmail: string;
}

const ROOT_OWNER_EMAILS = [
  "roytejaswi40@gmail.com",
  "roytejaswi206@gmail.com",
];

export function UserManagementTable({
  initialUsers,
  currentUserEmail,
}: UserManagementTableProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole =
      roleFilter === "ALL" ? true : u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    setIsLoading(userId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setSuccessMsg(`Successfully updated role to ${newRole}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update user role");
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsLoading(null);
    }
  };

  const handleTierChange = async (userId: string, newTier: string) => {
    setIsLoading(userId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: newTier }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update tier");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tier: newTier } : u))
      );
      setSuccessMsg(`Successfully updated tier to ${newTier}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update user tier");
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3B6B]/50 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] font-bold text-zinc-400">Filter:</span>
          {["ALL", "SUPER_ADMIN", "ADMIN", "USER"].map((rf) => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                roleFilter === rf
                  ? "bg-[#FF3B6B] text-white"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {rf}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback alerts */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          ✓ {successMsg}
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>Registered Accounts ({filteredUsers.length} Users)</span>
          <span>Role & Tier Control</span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            No matching users found.
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
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {filteredUsers.map((u) => {
                  const isRootOwner = ROOT_OWNER_EMAILS.includes(
                    u.email.toLowerCase()
                  );

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {u.name || "Nameless User"}
                          </span>
                          {isRootOwner && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30">
                              ROOT OWNER
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {u.email}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            u.role === "SUPER_ADMIN"
                              ? "bg-[#FF3B6B]/20 text-[#FF3B6B] border border-[#FF3B6B]/30"
                              : u.role === "ADMIN"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-white/5 text-zinc-400"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={u.tier}
                          disabled={isLoading === u.id}
                          onChange={(e) => handleTierChange(u.id, e.target.value)}
                          className="bg-black/50 border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-300 font-mono focus:outline-none"
                        >
                          <option value="FREE">FREE</option>
                          <option value="PREMIUM_MONTHLY">PREMIUM_MONTHLY</option>
                          <option value="PREMIUM_YEARLY">PREMIUM_YEARLY</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {u._count?.watchlist || 0}
                      </td>

                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {u._count?.watchHistory || 0}
                      </td>

                      <td className="py-3 px-4 text-zinc-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4">
                        {isRootOwner ? (
                          <span className="text-[10px] font-mono text-zinc-500 italic">
                            Protected Root
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={isLoading === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none"
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
