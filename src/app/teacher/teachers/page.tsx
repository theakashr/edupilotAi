"use client";

import { useEffect, useState, useCallback } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { ProvisionTeacherModal } from "@/components/teacher/ProvisionTeacherModal";
import { useAuth } from "@/contexts/AuthContext";
import type { UserProfile } from "@/types";
import {
  ShieldCheck,
  UserPlus,
  Users,
  Search,
  CheckCircle2,
  Mail,
  Calendar,
  Sparkles,
  RefreshCw,
  Award,
  KeyRound,
} from "lucide-react";

export default function TeacherDirectoryPage() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeachers = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch("/api/admin/provision-teacher", {
        headers: {
          "x-user-id": user.uid,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers || []);
      }
    } catch (err) {
      console.warn("Failed to fetch teachers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTeachers();
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      t.email?.toLowerCase().includes(q) ||
      t.displayName?.toLowerCase().includes(q) ||
      t.uid?.toLowerCase().includes(q)
    );
  });

  return (
    <RoleGuard allowedRoles={["teacher"]}>
      <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans">
        <TeacherNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Faculty &amp; Educator Administration</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Teacher Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                Add, provision, and review educator accounts. Authorized teachers have full access to course design, student diagnostic profiles, and Agnes AI.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="Refresh list"
                aria-label="Refresh list"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Teacher</span>
              </button>
            </div>
          </div>

          {/* Search & Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search teachers by name, email, or UID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs transition-all"
              />
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-600">Total Faculty</span>
              </div>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {teachers.length} Active
              </span>
            </div>
          </div>

          {/* Teachers Directory Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Authorized Faculty Directory
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                {filteredTeachers.length} of {teachers.length} shown
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Loading faculty directory...</span>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No matching teacher accounts found. Click <strong>Add Teacher</strong> to provision a new educator.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTeachers.map((t) => {
                  const initials = (t.displayName || t.email || "T")
                    .slice(0, 2)
                    .toUpperCase();
                  const dateStr = t.createdAt
                    ? new Date(t.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Recent";

                  const isCurrentUser = t.uid === user?.uid || t.email === user?.email;

                  return (
                    <div
                      key={t.uid}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {t.displayName || t.email.split("@")[0]}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{t.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 hidden md:flex">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Joined {dateStr}</span>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active Teacher</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Informational Guidance */}
          <div className="p-5 rounded-3xl bg-indigo-50/60 border border-indigo-100/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 space-y-1">
              <p className="font-semibold">EduPilot Teacher Provisioning Policy</p>
              <p className="text-indigo-800/90 leading-relaxed">
                Public self-registration defaults strictly to student permissions. All teacher profiles must be granted either through this administration dashboard or via the institutional provisioning CLI.
              </p>
            </div>
          </div>
        </main>

        {/* Add Teacher Modal */}
        <ProvisionTeacherModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTeacherProvisioned={fetchTeachers}
        />
      </div>
    </RoleGuard>
  );
}
