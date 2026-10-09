"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { logoutUser } from "@/services/auth/authService";
import { generateStudentId } from "@/lib/studentId";
import { StudentProfileModal } from "@/components/student/StudentProfileModal";
import { StudentNotificationCenter } from "@/components/student/notifications/StudentNotificationCenter";
import {
  Compass,
  BookOpen,
  Award,
  TrendingUp,
  Sparkles,
  LogOut,
  BrainCircuit,
  Copy,
  Check,
  UserCheck,
} from "lucide-react";

export function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const studentId = user ? profile?.studentId || generateStudentId(user.uid) : "";

  const handleCopyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!studentId) return;
    try {
      await navigator.clipboard.writeText(studentId);
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const navItems = [
    {
      label: "Home",
      href: "/student/dashboard",
      icon: Compass,
      active: pathname === "/student/dashboard" || pathname === "/student",
    },
    {
      label: "My Learning",
      href: "/student/learning",
      icon: BookOpen,
      active: pathname.startsWith("/student/learning"),
    },
    {
      label: "Assessments",
      href: "/student/assessments",
      icon: Award,
      active: pathname.startsWith("/student/assessments"),
    },
    {
      label: "Knowledge & Progress",
      href: "/student/progress",
      icon: TrendingUp,
      active: pathname.startsWith("/student/progress"),
    },
    {
      label: "AI Tutor",
      href: "/student/ai-tutor",
      icon: BrainCircuit,
      active: pathname.startsWith("/student/ai-tutor"),
    },
  ];

  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Student";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <aside className="w-64 border-r border-slate-200/80 bg-[#FAFAF9] flex-col justify-between hidden md:flex min-h-screen sticky top-0 shrink-0 select-none z-20">
        <div className="p-5 space-y-6">
          {/* Brand / Logo */}
          <Link href="/student/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900 tracking-tight text-[15px]">EduPilot</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/60">
                  AI
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Student Experience</span>
            </div>
          </Link>

          {/* Student ID Chip */}
          {studentId && (
            <div className="rounded-xl bg-white border border-slate-200/80 p-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                <span>Student ID</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 normal-case"
                  title="Copy student ID for course enrollment"
                >
                  {idCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <code className="block font-mono text-xs font-bold text-slate-800 tracking-wide truncate">
                {studentId}
              </code>
            </div>
          )}

          {/* Main Navigation */}
          <nav className="space-y-1">
            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Learning Portal
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    item.active
                      ? "bg-white text-indigo-600 shadow-sm shadow-slate-200/60 border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      item.active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* AI Learning Co-Pilot Badge */}
          <Link
            href="/student/ai-tutor"
            className="block relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 p-4 shadow-sm hover:border-indigo-300 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-900 group-hover:text-indigo-600 transition-colors">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
                Agnes 3.0 Co-Pilot
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">
                Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Provides trusted answers grounded in your course materials and concepts.
            </p>
          </Link>
        </div>

        {/* User profile footer with click-to-view-modal */}
        <div className="p-4 border-t border-slate-200/80 bg-white/60 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition-opacity flex-1 group"
              title="View Student Profile"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-indigo-500/10 shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors" title={displayName}>
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-400 truncate" title={user?.email || ""}>
                  {studentId || "Student"}
                </p>
              </div>
              <UserCheck className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0" />
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <StudentNotificationCenter />
              <button
                onClick={handleLogout}
                title="Sign out"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              aria-label="Sign out"
            >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Student Profile Modal */}
      <StudentProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}
