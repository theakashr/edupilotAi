"use client";

import { useState } from "react";
import { GraduationCap, Copy, Check, User, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { generateStudentId } from "@/lib/studentId";
import { StudentProfileModal } from "@/components/student/StudentProfileModal";

interface NoEnrolledCoursesProps {
  title?: string;
  description?: string;
}

export function NoEnrolledCourses({
  title = "No Enrolled Courses Yet",
  description = "You are not currently enrolled in any active courses. To access learning materials, verified concepts, and adaptive assessments, share your Student ID with your teacher.",
}: NoEnrolledCoursesProps) {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const studentId = user ? profile?.studentId || generateStudentId(user.uid) : "";

  const handleCopy = async () => {
    if (!studentId) return;
    try {
      await navigator.clipboard.writeText(studentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/80 p-8 sm:p-12 shadow-sm text-center max-w-2xl mx-auto my-8">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-16 w-80 h-80 bg-indigo-50/80 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              {description}
            </p>
          </div>

          {/* Student ID Card */}
          {studentId && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-5 max-w-md mx-auto text-left shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span>Your Official Student ID</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                  Verified Identity
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                <code className="font-mono text-base sm:text-lg font-bold text-slate-900 tracking-wider">
                  {studentId}
                </code>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copied
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-normal">
                Your instructor uses this unique ID to enroll you into their class. Only instructors can authorize course enrollments.
              </p>
            </div>
          )}

          {/* Quick steps */}
          <div className="pt-2 border-t border-slate-100 max-w-md mx-auto">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-left">
              How enrollment works:
            </h4>
            <div className="space-y-2 text-left text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Copy your unique Student ID above.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>Share it with your course instructor.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Once enrolled, published course materials, verified concepts, and diagnostics will appear here immediately.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>View My Profile</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <StudentProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
