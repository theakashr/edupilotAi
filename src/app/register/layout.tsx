import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your EduPilot AI account as a teacher or student.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
