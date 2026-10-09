"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser, loginWithGoogle } from "@/services/auth/authService";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedAIBackground } from "@/components/auth/AnimatedAIBackground";
import { AuthBranding } from "@/components/auth/AuthBranding";
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
  Building2,
} from "lucide-react";

// Student schema: NO role selector allowed
const studentRegisterSchema = z
  .object({
    displayName: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string().min(6, { message: "Please confirm your password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type StudentRegisterFormValues = z.infer<typeof studentRegisterSchema>;

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRole: "student" | "teacher" =
    searchParams.get("role") === "teacher" ? "teacher" : "student";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Teacher Access Request state
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherInstitution, setTeacherInstitution] = useState("");
  const [teacherDept, setTeacherDept] = useState("");
  const [teacherRequestSuccess, setTeacherRequestSuccess] = useState(false);
  const [teacherRequestLoading, setTeacherRequestLoading] = useState(false);

  const { user, role: currentRole, loading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentRegisterFormValues>({
    resolver: zodResolver(studentRegisterSchema),
  });

  useEffect(() => {
    if (!loading && user && currentRole) {
      if (currentRole === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    }
  }, [loading, user, currentRole, router]);

  if (!loading && user && currentRole) {
    return null;
  }

  const handleRoleChange = (newRole: "student" | "teacher") => {
    setError(null);
    router.replace(`/register?role=${newRole}`);
  };

  const handleGoogleRegister = async () => {
    setIsGoogleLoading(true);
    setError(null);

    // Google registration is strictly for student role to prevent privilege escalation
    const { user: firebaseUser, profile, error: googleError } = await loginWithGoogle();

    if (googleError) {
      setError(googleError);
      setIsGoogleLoading(false);
      return;
    }

    if (firebaseUser) {
      const trustedRole = profile?.role || "student";
      if (trustedRole === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    }
  };

  const onStudentSubmit = async (data: StudentRegisterFormValues) => {
    setIsLoading(true);
    setError(null);

    // Enforce strictly 'student' role. No client role manipulation allowed.
    const { user: firebaseUser, error: registerError } = await registerUser(
      data.email,
      data.password,
      data.displayName
    );

    if (registerError) {
      setError(registerError);
      setIsLoading(false);
      return;
    }

    if (firebaseUser) {
      router.push("/student/dashboard");
    }
  };

  const onTeacherRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName || !teacherEmail || !teacherInstitution) {
      setError("Please fill in all required fields.");
      return;
    }

    setError(null);
    setTeacherRequestLoading(true);

    // Simulated institutional request logging (prevents public unauthorized teacher creation)
    setTimeout(() => {
      setTeacherRequestLoading(false);
      setTeacherRequestSuccess(true);
    }, 800);
  };

  const isTeacher = activeRole === "teacher";

  return (
    <main className="min-h-screen relative flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 selection:bg-indigo-500/20 selection:text-indigo-900">
      <AnimatedAIBackground />

      <div className="w-full max-w-md animate-in fade-in-50 zoom-in-95 duration-300">
        <AuthBranding subtitle="Create your personalized EduPilot AI account" />

        <div className="rounded-3xl bg-white/95 border border-slate-200/90 p-7 sm:p-9 shadow-xl shadow-slate-200/50 backdrop-blur-md relative overflow-hidden">
          {/* Top Accent Bar */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 ${
              isTeacher
                ? "bg-linear-to-r from-violet-600 via-indigo-600 to-purple-600"
                : "bg-linear-to-r from-indigo-600 via-cyan-500 to-blue-600"
            }`}
          />

          {/* Segmented Switcher */}
          <div className="mb-6">
            <div
              role="tablist"
              aria-label="Select registration type"
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

            <div className="mt-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {isTeacher ? "Teacher Access" : "Student Registration"}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTeacher
                    ? "Institutional educator provisioning"
                    : "Join EduPilot to access AI tutoring and courses"}
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

          {/* Feedback Alert */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Tab 1: Student Public Registration */}
          {!isTeacher ? (
            <>
              {/* Google Sign-in */}
              <div className="mb-5">
                <button
                  type="button"
                  onClick={handleGoogleRegister}
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
                  <span>Sign up with Google</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider text-[10px]">
                    or with email
                  </span>
                </div>
              </div>

              {/* Registration Form (No Role Selector Allowed) */}
              <form onSubmit={handleSubmit(onStudentSubmit)} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="displayName"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    autoComplete="name"
                    placeholder="Akash Kumar"
                    {...register("displayName")}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none placeholder:text-slate-400 ${
                      errors.displayName
                        ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    }`}
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">
                      {errors.displayName.message}
                    </p>
                  )}
                </div>

                {/* Email Address */}
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
                    placeholder="student@example.com"
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

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      {...register("confirmPassword")}
                      className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none placeholder:text-slate-400 ${
                        errors.confirmPassword
                          ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account…</span>
                    </>
                  ) : (
                    <>
                      <span>Register as Student</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Already have an account?{" "}
                  <Link
                    href="/login?role=student"
                    className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Sign in to Student Portal
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* Tab 2: Teacher Institutional Provisioning Request */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-violet-50/90 border border-violet-100 text-violet-900 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-violet-950">
                  <ShieldCheck className="w-4 h-4 text-violet-700" />
                  <span>Academic Verification Required</span>
                </div>
                <p>
                  Teacher workspaces possess permissions to configure curricula, upload materials,
                  and inspect AI conflict resolutions. In compliance with EduPilot security policy,
                  teacher accounts require institutional verification.
                </p>
              </div>

              {teacherRequestSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Verification Request Submitted
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Your request for <strong>{teacherInstitution}</strong> has been logged. Your
                    institution administrator will provision your access credentials.
                  </p>
                  <Link
                    href="/login?role=teacher"
                    className="inline-flex items-center justify-center gap-2 mt-2 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
                  >
                    <span>Back to Teacher Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={onTeacherRequestSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Prof. John Doe"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institutional Email (.edu / university) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="teacher@institution.edu"
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      School / Institution Name *
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Stanford University"
                        value={teacherInstitution}
                        onChange={(e) => setTeacherInstitution(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Academic Department / Subject
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science & AI"
                      value={teacherDept}
                      onChange={(e) => setTeacherDept(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={teacherRequestLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm shadow-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                  >
                    {teacherRequestLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Request…</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Submit Teacher Verification Request</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-1">
                <p className="text-xs text-slate-500">
                  Already provisioned as an educator?{" "}
                  <Link
                    href="/login?role=teacher"
                    className="font-bold text-violet-700 hover:text-violet-900 transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
