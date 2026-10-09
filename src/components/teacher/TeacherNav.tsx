"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { logoutUser } from "@/services/auth/authService";
import { Sparkles, LogOut, Plus, ChevronRight, BookOpen, LayoutDashboard, Users } from "lucide-react";

interface TeacherNavProps {
  courseId?: string;
  courseTitle?: string;
}

export function TeacherNav({ courseId, courseTitle }: TeacherNavProps) {
  const { profile, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const isDashboard = pathname === "/teacher/dashboard" || pathname === "/teacher";
  const isCourses = pathname.startsWith("/teacher/courses");
  const isTeachers = pathname === "/teacher/teachers";

  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Teacher";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 transition-all duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/teacher/dashboard"
              className="flex items-center gap-2.5 text-slate-900 font-bold text-base tracking-tight hover:opacity-90 transition-opacity shrink-0 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight">EduPilot</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/80">
                  AI
                </span>
              </div>
            </Link>

            <span className="text-slate-300 select-none">/</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/70 shrink-0">
              Teacher Workspace
            </span>

            {courseTitle && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" />
                <Link
                  href={`/teacher/courses/${courseId}`}
                  className="hidden sm:inline text-xs font-medium text-slate-600 hover:text-slate-900 truncate max-w-[200px]"
                  title={courseTitle}
                >
                  {courseTitle}
                </Link>
              </>
            )}
          </div>

          {/* Primary Navigation Links */}
          <nav aria-label="Teacher primary navigation" className="hidden md:flex items-center gap-1">
            <Link
              href="/teacher/dashboard"
              aria-current={isDashboard ? "page" : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isDashboard
                  ? "bg-slate-100 text-indigo-600 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/teacher/courses"
              aria-current={isCourses && !courseId ? "page" : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isCourses && !courseId
                  ? "bg-slate-100 text-indigo-600 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Courses</span>
            </Link>

            <Link
              href="/teacher/teachers"
              aria-current={isTeachers ? "page" : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isTeachers
                  ? "bg-slate-100 text-indigo-600 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Faculty</span>
            </Link>
          </nav>

          {/* User profile & Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/teacher/courses/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Create Course</span>
            </Link>

            {/* Profile Avatar & Info */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200/80">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {userInitials}
              </div>
              <div className="hidden lg:flex flex-col text-left min-w-0 max-w-[130px]">
                <span className="text-xs font-semibold text-slate-800 truncate" title={displayName}>
                  {displayName}
                </span>
                <span className="text-[11px] text-slate-400 truncate" title={user?.email || ""}>
                  {user?.email || "Teacher"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
              title="Sign out of EduPilot"
              aria-label="Sign out of EduPilot"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
