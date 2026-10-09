import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";

export const metadata: Metadata = {
  title: "Teacher Dashboard",
  description: "EduPilot AI Teacher workspace — manage courses, students, and AI insights.",
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["teacher"]}>
      {children}
    </RoleGuard>
  );
}

