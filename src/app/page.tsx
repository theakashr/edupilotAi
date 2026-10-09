"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedAIBackground } from "@/components/auth/AnimatedAIBackground";
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  Presentation,
  ShieldCheck,
  BrainCircuit,
  Layers,
} from "lucide-react";

export default function HomePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && role) {
      if (role === "teacher") {
        router.push("/teacher/dashboard");
      } else if (role === "student") {
        router.push("/student/dashboard");
      }
    }
  }, [user, role, loading, router]);

  // While checking auth state, show a clean centered state if user exists
  if (loading || (user && role)) {
    return (
      <div
        className="flex min-h-screen w-full items-center justify-center bg-[#FAFAF9]"
        role="status"
        aria-label="Loading EduPilot AI"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Connecting to EduPilot AI…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col justify-between font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      <AnimatedAIBackground />

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 tracking-tight text-lg">
              EduPilot
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
              AI
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/80"
          >
            Direct Sign In
          </Link>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 hidden sm:inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Phase 1–8 Active
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 max-w-5xl mx-auto w-full text-center">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-2xs text-xs font-semibold text-indigo-700 mb-6 backdrop-blur-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Next-Generation Adaptive Learning &amp; Teacher Co-Pilot</span>
        </div>

        {/* Headline & Supporting Text */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] max-w-3xl">
          Learning,{" "}
          <span className="bg-linear-to-r from-indigo-600 via-violet-600 to-cyan-600 bg-clip-text text-transparent">
            reimagined
          </span>{" "}
          with AI.
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
          Discover a smarter way to teach, learn, and grow with EduPilot AI.
        </p>

        {/* Interactive Role Cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl text-left">
          {/* Student Card */}
          <div className="group relative rounded-3xl bg-white/90 border border-slate-200/90 p-7 shadow-xs hover:-translate-y-1.5 hover:shadow-xl hover:border-indigo-300/80 transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-xs">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-indigo-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                <GraduationCap className="w-6 h-6" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                Learner Workspace
              </div>

              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Student
              </h2>

              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Explore your courses, assess your knowledge, and track your progress.
              </p>

              <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
                  Agnes AI Tutor
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-cyan-500" />
                  Personalized Path
                </span>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100">
              <Link
                href="/login?role=student"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all group-hover:bg-indigo-600"
              >
                <span>Continue as Student</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Teacher Card */}
          <div className="group relative rounded-3xl bg-white/90 border border-slate-200/90 p-7 shadow-xs hover:-translate-y-1.5 hover:shadow-xl hover:border-violet-300/80 transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-xs">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 mb-5 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-200">
                <Presentation className="w-6 h-6" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                Educator Portal
              </div>

              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Teacher
              </h2>

              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Manage courses, organize learning materials, and support your students.
              </p>

              <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
                  Source Trust Verified
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  AI Teaching Assistant
                </span>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100">
              <Link
                href="/login?role=teacher"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-900/25 active:scale-[0.98] transition-all"
              >
                <span>Continue as Teacher</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-400">
        <p>© 2026 EduPilot AI. Adaptive Learning &amp; Teacher Co-Pilot platform.</p>
      </footer>
    </div>
  );
}
