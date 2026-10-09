import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EduPilot AI",
    template: "%s | EduPilot AI",
  },
  description: "Adaptive Learning & Teacher AI Co-Pilot — personalized education powered by AI.",
  robots: {
    index: false, // authenticated app; don't index private pages
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased bg-white text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
