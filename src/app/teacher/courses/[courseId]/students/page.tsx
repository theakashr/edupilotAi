"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { getUserProfile, findStudentByStudentId } from "@/lib/firebase/firestore";
import { generateStudentId } from "@/lib/studentId";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { CourseWorkspaceNav } from "@/components/teacher/CourseWorkspaceNav";
import type { Course, CourseMember, UserProfile } from "@/types";
import {
  Users,
  UserPlus,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Search,
  Check,
  UserCheck,
  Copy,
  Sparkles,
  Trash2,
} from "lucide-react";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

interface EnrolledStudentItem {
  member: CourseMember;
  profile?: UserProfile | null;
}

export default function CourseStudentsPage({ params }: PageProps) {
  const { courseId } = use(params);
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<EnrolledStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [publishingCourse, setPublishingCourse] = useState(false);

  const handlePublishCourse = async () => {
    if (!course) return;
    setPublishingCourse(true);
    try {
      const res = await courseService.updateCourse(course.id, { status: "active" });
      if (res.success) {
        setCourse((prev) => (prev ? { ...prev, status: "active" } : null));
      }
    } catch {
      // ignore
    } finally {
      setPublishingCourse(false);
    }
  };

  // Enroll Student Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [verifiedStudent, setVerifiedStudent] = useState<{
    uid: string;
    displayName: string;
    email: string;
    studentId: string;
  } | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  // Table copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemoveStudent = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this student from the course?")) return;
    setRemovingId(memberId);
    try {
      const res = await courseService.removeCourseMember(memberId);
      if (!res.success) throw new Error(res.error);
      setStudents((prev) => prev.filter((s) => s.member.id !== memberId));
    } catch (err: unknown) {
      alert("Failed to remove student: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    async function loadCourseAndStudents() {
      if (!courseId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch course details
        const courseRes = await courseService.getCourseById(courseId);
        if (!courseRes.success) {
          setError(courseRes.error);
          setLoading(false);
          return;
        }

        if (!courseRes.data) {
          setError("Course not found");
          setLoading(false);
          return;
        }

        // Ownership verification
        if (courseRes.data.teacherId !== user.uid) {
          setIsAccessDenied(true);
          setLoading(false);
          return;
        }

        setCourse(courseRes.data);

        // 2. Fetch course members
        const membersRes = await courseService.listCourseMembers(courseId);
        if (!membersRes.success) {
          setError(membersRes.error);
          setLoading(false);
          return;
        }

        // 3. Hydrate with UserProfiles where available
        const memberList = membersRes.data;
        const studentItems: EnrolledStudentItem[] = await Promise.all(
          memberList.map(async (m) => {
            try {
              const prof = await getUserProfile(m.studentId);
              return { member: m, profile: prof };
            } catch {
              return { member: m, profile: null };
            }
          })
        );

        setStudents(studentItems);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load students");
      } finally {
        setLoading(false);
      }
    }

    loadCourseAndStudents();
  }, [courseId, user?.uid]);

  const handleLookupStudent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setEnrollError(null);
    setVerifiedStudent(null);

    try {
      const found = await findStudentByStudentId(searchQuery.trim());
      if (!found) {
        setSearchError(
          `No student account found with ID "${searchQuery.trim()}". Please ensure the student has registered and copied their exact Student ID.`
        );
        return;
      }

      setVerifiedStudent(found);
    } catch {
      setSearchError("Failed to lookup student. Please check network connection.");
    } finally {
      setSearchLoading(false);
    }
  };

  const isAlreadyEnrolled = verifiedStudent
    ? students.some((s) => s.member.studentId === verifiedStudent.uid)
    : false;

  const handleEnrollSubmit = async () => {
    if (!verifiedStudent) return;
    if (isAlreadyEnrolled) {
      setEnrollError("This student is already enrolled in this course.");
      return;
    }

    setEnrollLoading(true);
    setEnrollError(null);
    setEnrollSuccess(null);

    try {
      const res = await courseService.enrollStudent(courseId, verifiedStudent.uid);
      if (!res.success) {
        setEnrollError(res.error);
        setEnrollLoading(false);
        return;
      }

      // Hydrate profile for instant table update
      let prof: UserProfile | null = null;
      try {
        prof = await getUserProfile(verifiedStudent.uid);
      } catch {
        prof = null;
      }

      setStudents((prev) => [
        { member: res.data, profile: prof },
        ...prev.filter((item) => item.member.id !== res.data.id),
      ]);

      setEnrollSuccess(`Successfully enrolled ${verifiedStudent.displayName}!`);
      setTimeout(() => {
        setIsEnrollModalOpen(false);
        setVerifiedStudent(null);
        setSearchQuery("");
        setEnrollSuccess(null);
      }, 1200);
    } catch (err: unknown) {
      setEnrollError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans">
        <TeacherNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-rose-200 p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Access Restricted</h1>
            <p className="text-xs text-slate-500 mt-2">
              Only the course instructor can view and manage enrolled student cohorts for this workspace.
            </p>
            <div className="mt-6">
              <Link
                href="/teacher/courses"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Back to Courses
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      <TeacherNav courseId={courseId} courseTitle={course?.title} />

      <main id="main-content" className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {course && <CourseWorkspaceNav course={course} />}

        {/* Draft Notice & Quick Publish Banner */}
        {course?.status === "draft" && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Course is currently in Draft
                </h3>
                <p className="text-xs text-amber-700/90 mt-0.5">
                  Enrolled students are registered in your cohort. Click publish so students can access materials, knowledge trees, and AI assistance.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePublishCourse}
              disabled={publishingCourse}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{publishingCourse ? "Publishing..." : "Publish Course Now"}</span>
            </button>
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Enrolled Students ({students.length})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify student IDs, manage enrollments, and supervise class participation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEnrollModalOpen(true);
              setVerifiedStudent(null);
              setSearchError(null);
              setEnrollError(null);
              setSearchQuery("");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll Student</span>
          </button>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        {/* Students Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading enrolled student roster...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-14 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No students enrolled yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Add students to this workspace using their unique Student ID (e.g. EDU-XXXXXXXX) to grant them access to course materials and AI learning.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Enroll First Student</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                    <th scope="col" className="px-6 py-3.5">Student Details</th>
                    <th scope="col" className="px-6 py-3.5">Official Student ID</th>
                    <th scope="col" className="px-6 py-3.5">Enrollment Status</th>
                    <th scope="col" className="px-6 py-3.5">Enrolled Date</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((item) => {
                    const studentDisplayId =
                      item.profile?.studentId || generateStudentId(item.member.studentId);
                    const name =
                      item.profile?.displayName || `Student (${item.member.studentId.slice(0, 6)}…)`;
                    const email = item.profile?.email || "Unknown email";
                    const isCopied = copiedId === studentDisplayId;

                    return (
                      <tr key={item.member.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{name}</p>
                              <p className="text-[11px] text-slate-400 truncate">{email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                            <code className="font-mono text-xs font-bold text-indigo-950">
                              {studentDisplayId}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyId(studentDisplayId)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5"
                              title="Copy Student ID"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {item.member.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-400 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-300" />
                            {item.member.joinedAt ? "Active Cohort" : "Recently"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(item.member.id)}
                            disabled={removingId === item.member.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove Student"
                          >
                            {removingId === item.member.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Two-Step Verification Enrollment Modal */}
      {isEnrollModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enroll-modal-title"
        >
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 id="enroll-modal-title" className="text-sm font-bold text-slate-900">
                  Enroll Student in Course
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                aria-label="Close dialog"
                disabled={enrollLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Step 1: Search Form */}
              <form onSubmit={handleLookupStudent} className="space-y-2">
                <label htmlFor="student-id-input" className="block text-xs font-semibold text-slate-700">
                  Student ID or Firebase UID *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="student-id-input"
                      type="text"
                      required
                      placeholder="e.g. EDU-4A8F9K2M"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchError(null);
                      }}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchLoading || !searchQuery.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Students can view and copy their unique Student ID from their dashboard sidebar.
                </p>
              </form>

              {searchError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Step 2: Verification Preview Card */}
              {verifiedStudent && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Verified Student Profile</span>
                    </span>

                    {isAlreadyEnrolled ? (
                      <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        Already Enrolled
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Eligible
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-indigo-100">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {verifiedStudent.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {verifiedStudent.displayName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{verifiedStudent.email}</p>
                      <p className="text-[10px] font-mono text-indigo-700 mt-0.5 font-bold">
                        ID: {verifiedStudent.studentId}
                      </p>
                    </div>
                  </div>

                  {isAlreadyEnrolled && (
                    <p className="text-xs text-amber-700 font-medium">
                      This student is already a member of this course cohort.
                    </p>
                  )}
                </div>
              )}

              {enrollError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{enrollError}</span>
                </div>
              )}

              {enrollSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{enrollSuccess}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  disabled={enrollLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleEnrollSubmit}
                  disabled={
                    enrollLoading || !verifiedStudent || isAlreadyEnrolled
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50 transition-colors"
                >
                  {enrollLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm &amp; Enroll</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
