"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { logoutUser } from "@/services/auth/authService";
import { StudentProfileModal } from "@/components/student/StudentProfileModal";
import { Sparkles, LogOut } from "lucide-react";

export function StudentMobileHeader() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Student";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
        <Link href="/student/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">EduPilot</span>
            <span className="text-[10px] ml-1 font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100">
              AI
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center shadow-sm hover:opacity-90"
            title="Open Student Profile"
          >
            {userInitials}
          </button>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <StudentProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
