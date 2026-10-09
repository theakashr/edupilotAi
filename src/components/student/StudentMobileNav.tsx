"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, BookOpen, Award, TrendingUp } from "lucide-react";

export function StudentMobileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Home",
      href: "/student/dashboard",
      icon: Compass,
      active: pathname === "/student/dashboard" || pathname === "/student",
    },
    {
      label: "Learn",
      href: "/student/learning",
      icon: BookOpen,
      active: pathname.startsWith("/student/learning"),
    },
    {
      label: "Assess",
      href: "/student/assessments",
      icon: Award,
      active: pathname.startsWith("/student/assessments"),
    },
    {
      label: "Progress",
      href: "/student/progress",
      icon: TrendingUp,
      active: pathname.startsWith("/student/progress"),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-slate-200/80 px-4 py-2 pb-safe shadow-lg"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 ${
                item.active
                  ? "text-indigo-600 font-semibold scale-105"
                  : "text-slate-400 hover:text-slate-600 font-normal"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
