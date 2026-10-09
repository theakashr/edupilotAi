"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

interface AuthBrandingProps {
  subtitle?: string;
}

export function AuthBranding({ subtitle = "Adaptive Learning & Teacher AI Co-Pilot" }: AuthBrandingProps) {
  return (
    <div className="flex flex-col items-center text-center mb-6">
      <Link
        href="/"
        className="group inline-flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02] focus:outline-none"
      >
        <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all duration-200">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
            EduPilot
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
            AI
          </span>
        </div>
      </Link>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-2 font-medium tracking-wide">
          {subtitle}
        </p>
      )}
    </div>
  );
}
