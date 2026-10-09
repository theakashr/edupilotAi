"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser, loginWithGoogle, logoutUser } from "@/services/auth/authService";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/lib/firebase/firestore";
import { AnimatedAIBackground } from "@/components/auth/AnimatedAIBackground";
import { AuthBranding } from "@/components/auth/AuthBranding";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  GraduationCap,
  Presentation,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRole: "student" | "teacher" =
    searchParams.get("role") === "teacher" ? "teacher" : "student";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const { user, profile: authProfile, role, loading } = useAuth();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // If already authenticated and profile loaded, redirect based on real role
  useEffect(() => {
    if (!loading && user && role) {
      if (authProfile?.isActive === false) {
        logoutUser().then(() => {
          setError("Your account has been deactivated. Please contact an administrator.");
        });
        return;
      }

      if (role === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    }
  }, [loading, user, role, authProfile, router]);

  if (!loading && user && role && authProfile?.isActive !== false) {
    return null;
  }

  const handleRoleChange = (newRole: "student" | "teacher") => {
    setError(null);
    setRoleNotice(null);
    router.replace(`/login?role=${newRole}`);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setRoleNotice(null);

    const { user: firebaseUser, profile, error: googleError } = await loginWithGoogle();

    if (googleError) {
      setError(googleError);
      setIsGoogleLoading(false);
      return;
    }

    if (firebaseUser) {
      const userProfile = profile || (await getUserProfile(firebaseUser.uid));

      if (!userProfile) {
        await logoutUser();
        setError("Account profile not found. Please contact an administrator.");
        setIsGoogleLoading(false);
        return;
      }

      if (userProfile.isActive === false) {
        await logoutUser();
        setError("Your account has been deactivated. Please contact an administrator.");
        setIsGoogleLoading(false);
        return;
      }

      const trustedRole = userProfile.role;

      // Strict Teacher Portal Boundary for Google OAuth
      if (activeRole === "teacher") {
        if (trustedRole !== "teacher") {
          // Immediately revoke session so unauthorized student is signed out
          await logoutUser();
          setIsGoogleLoading(false);
          setError(
            "Access Denied: This Google account is not an authorized teacher account. Student accounts cannot log in through the Teacher Portal."
          );
          return;
        }
        router.push("/teacher/dashboard");
        return;
      }

      // Student Portal Boundary
      if (trustedRole === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    setRoleNotice(null);

    const { user: firebaseUser, error: loginError } = await loginUser(
      data.email,
      data.password
    );

    if (loginError) {
      setError(loginError);
      setIsLoading(false);
      return;
    }

    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);

      if (!profile) {
        await logoutUser();
        setError("Account profile not found. Please contact an administrator.");
        setIsLoading(false);
        return;
      }

      if (profile.isActive === false) {
        await logoutUser();
        setError("Your teacher account has been deactivated. Please contact an administrator.");
        setIsLoading(false);
        return;
      }

      const trustedRole = profile.role;

      // Strict Teacher Portal Verification
      if (activeRole === "teacher") {
        if (trustedRole !== "teacher") {
          // Immediately revoke session so unauthorized student is signed out
          await logoutUser();
          setIsLoading(false);
          setError(
            "Access Denied: This account is registered as a Student. Student accounts are not permitted to log in through the Teacher Portal."
          );
          return;
        }
        router.push("/teacher/dashboard");
        return;
      }

      // Student Portal Verification
      if (trustedRole === "teacher") {
        router.push("/teacher/dashboard");
      } else if (trustedRole === "student") {
        router.push("/student/dashboard");
      } else {
        await logoutUser();
        router.push("/unauthorized");
      }
    }
  };

  const isTeacher = activeRole === "teacher";

  return (
    <main className="min-h-screen relative flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 selection:bg-indigo-500/20 selection:text-indigo-900">
      <AnimatedAIBackground />

      <div className="w-full max-w-md animate-in fade-in-50 zoom-in-95 duration-300">
        {/* Animated Brand Logo */}
        <AuthBranding subtitle="Sign in to your intelligent learning portal" />

        {/* Auth Card Container */}
        <div className="rounded-3xl bg-white/95 border border-slate-200/90 p-7 sm:p-9 shadow-xl shadow-slate-200/50 backdrop-blur-md relative overflow-hidden">
          {/* Subtle Top Accent Bar */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 ${
              isTeacher
                ? "bg-linear-to-r from-violet-600 via-indigo-600 to-purple-600"
                : "bg-linear-to-r from-indigo-600 via-cyan-500 to-blue-600"
            }`}
          />

          {/* Segmented Role Switcher */}
          <div className="mb-6">
            <div
              role="tablist"
              aria-label="Select portal type"
              className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isTeacher}
                onClick={() => handleRoleChange("student")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                  !isTeacher
                    ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={isTeacher}
                onClick={() => handleRoleChange("teacher")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isTeacher
                    ? "bg-white text-violet-700 shadow-xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Presentation className="w-4 h-4" />
                <span>Teacher</span>
              </button>
            </div>

            {/* Context Badge */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {isTeacher ? "Teacher Workspace" : "Student Portal"}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTeacher
                    ? "Access courses, materials, and student cohorts"
                    : "Continue your AI-assisted learning journey"}
                </p>
              </div>

              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  isTeacher
                    ? "bg-violet-50 text-violet-700 border-violet-100"
                    : "bg-indigo-50 text-indigo-700 border-indigo-100"
                }`}
              >
                {isTeacher ? "Educator" : "Learner"}
              </span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
                {error.includes("Student Portal") && (
                  <button
                    type="button"
                    onClick={() => handleRoleChange("student")}
                    className="mt-1.5 font-bold underline text-indigo-700 hover:text-indigo-900 block"
                  >
                    Switch to Student Portal →
                  </button>
                )}
              </div>
            </div>
          )}

          {roleNotice && (
            <div
              role="status"
              className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <p className="font-medium">{roleNotice}</p>
            </div>
          )}

          {/* Google Sign-in Option */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 text-slate-700 text-xs font-semibold shadow-2xs active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.665-5.17 3.665-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.44 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.56 1.24 6.58l4.04 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider text-[10px]">
                or sign in with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={isTeacher ? "teacher@school.edu" : "student@university.edu"}
                {...register("email")}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none placeholder:text-slate-400 ${
                  errors.email
                    ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20"
                    : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none placeholder:text-slate-400 ${
                    errors.password
                      ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 mt-2 ${
                isTeacher
                  ? "bg-slate-900 hover:bg-slate-800 shadow-slate-900/20"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In as {isTeacher ? "Teacher" : "Student"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            {isTeacher ? (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500">
                  New teacher? Teacher access requires institutional provisioning.
                </p>
                <Link
                  href="/register?role=teacher"
                  className="text-xs font-bold text-violet-700 hover:text-violet-900 transition-colors inline-flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Request Institutional Teacher Access</span>
                </Link>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register?role=student"
                  className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Create Student Account
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultEmail={getValues("email") || ""}
      />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}