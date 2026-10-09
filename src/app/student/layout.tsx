import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentMobileHeader } from "@/components/student/StudentMobileHeader";
import { StudentMobileNav } from "@/components/student/StudentMobileNav";

export const metadata: Metadata = {
  title: "EduPilot AI — Student Learning Experience",
  description: "EduPilot AI Student workspace — personalized learning journeys, adaptive diagnostics, and AI co-pilot.",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col md:flex-row text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
        <StudentSidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
          <StudentMobileHeader />
          <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <StudentMobileNav />
      </div>
    </RoleGuard>
  );
}


