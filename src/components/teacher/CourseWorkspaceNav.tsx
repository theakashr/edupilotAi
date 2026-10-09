"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Megaphone,
  CheckSquare,
  Sparkles,
  Network,
  BarChart3,
  Bot,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import type { Course, CourseStatus } from "@/types";
import { courseService } from "@/services/courses/courseService";

interface CourseWorkspaceNavProps {
  course: Course;
  onEditClick?: () => void;
}

export function CourseWorkspaceNav({ course, onEditClick }: CourseWorkspaceNavProps) {
  const pathname = usePathname();
  const basePath = `/teacher/courses/${course.id}`;
  const [publishedLocally, setPublishedLocally] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const currentStatus: CourseStatus = publishedLocally ? "active" : course.status;

  const handleQuickPublish = async () => {
    setIsPublishing(true);
    try {
      const res = await courseService.updateCourse(course.id, { status: "active" });
      if (res.success) {
        setPublishedLocally(true);
      }
    } catch {
      // ignore
    } finally {
      setIsPublishing(false);
    }
  };

  const tabs = [
    {
      label: "Overview",
      href: basePath,
      active: pathname === basePath,
      icon: LayoutDashboard,
      disabled: false,
    },
    {
      label: "Students",
      href: `${basePath}/students`,
      active: pathname.startsWith(`${basePath}/students`),
      icon: Users,
      disabled: false,
    },
    {
      label: "Materials",
      href: `${basePath}/materials`,
      active: pathname.startsWith(`${basePath}/materials`),
      icon: FileText,
      disabled: false,
    },
    {
      label: "Knowledge",
      href: `${basePath}/knowledge`,
      active: pathname.startsWith(`${basePath}/knowledge`),
      icon: Network,
      disabled: false,
    },
    {
      label: "Conflicts",
      href: `${basePath}/conflicts`,
      active: pathname.startsWith(`${basePath}/conflicts`),
      icon: ShieldAlert,
      disabled: false,
    },
    {
      label: "Announcements",
      href: `${basePath}/announcements`,
      active: pathname.startsWith(`${basePath}/announcements`),
      icon: Megaphone,
      disabled: false,
    },
    {
      label: "Assessments",
      href: `${basePath}/assessments`,
      active: pathname.startsWith(`${basePath}/assessments`),
      icon: CheckSquare,
      disabled: false,
    },
    {
      label: "AI Insights",
      href: `${basePath}/ai-insights`,
      active: pathname.startsWith(`${basePath}/ai-insights`),
      icon: Sparkles,
      disabled: false,
    },
    {
      label: "Analytics",
      href: "#",
      active: false,
      icon: BarChart3,
      disabled: true,
      phase: "Phase 8",
    },
    {
      label: "Agent Control",
      href: "#",
      active: false,
      icon: Bot,
      disabled: true,
      phase: "Phase 17",
    },
  ];

  const statusColors = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    archived: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        {/* Course Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                {course.subject}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
                  statusColors[currentStatus] || statusColors.draft
                }`}
              >
                {currentStatus}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {course.title}
            </h1>
            <p className="text-sm text-gray-500 line-clamp-1 max-w-2xl">
              {course.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {currentStatus === "draft" && (
              <button
                type="button"
                onClick={handleQuickPublish}
                disabled={isPublishing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isPublishing ? "Publishing..." : "Publish Course"}</span>
              </button>
            )}
            {onEditClick && (
              <button
                type="button"
                onClick={onEditClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
              >
                Edit Course Details
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav
          aria-label="Course sections"
          className="mt-6 flex space-x-1 overflow-x-auto border-t border-gray-100 pt-2 pb-1 scrollbar-none"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            if (tab.disabled) {
              return (
                <div
                  key={tab.label}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-400 cursor-not-allowed select-none opacity-60 rounded-md shrink-0"
                  title={`${tab.label} (Scheduled for ${tab.phase})`}
                >
                  <Icon className="w-3.5 h-3.5 text-gray-300" aria-hidden="true" />
                  <span>{tab.label}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.2 rounded font-mono">
                    {tab.phase}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={tab.label}
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                  tab.active
                    ? "bg-blue-50 text-blue-700 font-semibold shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${tab.active ? "text-blue-600" : "text-gray-400"}`}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
