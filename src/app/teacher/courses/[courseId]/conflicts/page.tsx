"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { conflictService } from "@/services/conflict/conflictService";
import { materialService } from "@/services/materials/materialService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { CourseWorkspaceNav } from "@/components/teacher/CourseWorkspaceNav";
import { EditSourceProfileModal } from "@/components/teacher/EditSourceProfileModal";
import { ConflictReviewModal } from "@/components/teacher/ConflictReviewModal";
import type { Course, Material, SourceProfile, SourceConflict } from "@/types";
import { ShieldAlert, AlertCircle, Loader2, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default function ConflictsPage({ params }: PageProps) {
  const { courseId } = use(params);
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [profiles, setProfiles] = useState<SourceProfile[]>([]);
  const [conflicts, setConflicts] = useState<SourceConflict[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<"conflicts" | "trust">("conflicts");
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [reviewingConflict, setReviewingConflict] = useState<SourceConflict | null>(null);

  const refresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!courseId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);

        const courseRes = await courseService.getCourseById(courseId);
        if (ignore) return;

        if (!courseRes.success) {
          setError(courseRes.error || "Failed to load course");
          return;
        }
        if (!courseRes.data) {
          setError("Course not found");
          return;
        }

        if (courseRes.data.teacherId !== user.uid) {
          setIsAccessDenied(true);
          return;
        }
        setCourse(courseRes.data);

        // Fetch materials and direct authenticated Firestore queries for profiles & conflicts
        const [matRes, profRes, confRes] = await Promise.all([
          materialService.listCourseMaterials(courseId),
          conflictService.listCourseSourceProfiles(courseId),
          conflictService.listCourseConflicts(courseId),
        ]);

        if (ignore) return;

        if (matRes.success) setMaterials(matRes.data);

        if (profRes.success) {
          setProfiles(profRes.data);
        } else {
          const apiProf = await fetch(`/api/courses/${courseId}/source-profiles?userId=${user.uid}`)
            .then(r => r.json())
            .catch(() => null);
          if (apiProf?.success && apiProf.data) setProfiles(apiProf.data);
        }

        if (confRes.success) {
          setConflicts(confRes.data);
        } else {
          const apiConf = await fetch(`/api/courses/${courseId}/conflicts?userId=${user.uid}`)
            .then(r => r.json())
            .catch(() => null);
          if (apiConf?.success && apiConf.data) setConflicts(apiConf.data);
        }

      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [courseId, user?.uid, refreshKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Access Denied</h3>
            <p className="text-sm">You do not have permission to view this course&apos;s conflicts.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-6 h-6" />
          <p>{error || "Course not found"}</p>
        </div>
      </div>
    );
  }

  const pendingConflicts = conflicts.filter(c => c.status === "pending");
  const resolvedConflicts = conflicts.filter(c => c.status !== "pending");

  return (
    <div className="min-h-screen bg-slate-50">
      <TeacherNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{course.title}</h1>
          <p className="text-slate-600">Manage source trust profiles and resolve factual contradictions detected by Agnes AI.</p>
        </div>

        <CourseWorkspaceNav course={course} />

        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 flex">
            <button
              onClick={() => setActiveTab("conflicts")}
              className={`flex-1 py-4 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${
                activeTab === "conflicts"
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Source Conflicts
              {pendingConflicts.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs py-0.5 px-2 rounded-full font-bold">
                  {pendingConflicts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("trust")}
              className={`flex-1 py-4 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${
                activeTab === "trust"
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Source Trust Profiles
            </button>
          </div>

          <div className="p-6">
            {activeTab === "conflicts" ? (
              <div className="space-y-8">
                {/* Pending Conflicts */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Pending Review ({pendingConflicts.length})
                  </h3>
                  {pendingConflicts.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center">
                      <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                      <h4 className="text-slate-800 font-medium">All clear!</h4>
                      <p className="text-slate-500 text-sm mt-1">Agnes hasn&apos;t detected any unresolved source conflicts.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {pendingConflicts.map(conflict => (
                        <div key={conflict.id} className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                PENDING
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                conflict.severity === "high" ? "bg-red-50 text-red-700 border-red-200" :
                                conflict.severity === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-blue-50 text-blue-700 border-blue-200"
                              }`}>
                                {conflict.severity.toUpperCase()}
                              </span>
                              {conflict.conceptName && (
                                <span className="text-xs text-slate-500 truncate">Concept: {conflict.conceptName}</span>
                              )}
                            </div>
                            <h4 className="text-slate-800 font-medium text-sm line-clamp-2 mb-2">
                              {conflict.conflictSummary}
                            </h4>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <span>Source A: {conflict.materialTitleA || conflict.materialIdA}</span>
                              <ArrowRight className="w-3 h-3 mx-1" />
                              <span>Source B: {conflict.materialTitleB || conflict.materialIdB}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setReviewingConflict(conflict)}
                            className="shrink-0 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Review
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolved Conflicts */}
                {resolvedConflicts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      Resolved ({resolvedConflicts.length})
                    </h3>
                    <div className="grid gap-3">
                      {resolvedConflicts.map(conflict => (
                        <div key={conflict.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                {conflict.status.toUpperCase()}
                              </span>
                              <span className="text-xs text-slate-500 truncate">
                                {conflict.conceptName ? `Concept: ${conflict.conceptName}` : 'General Conflict'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 truncate">{conflict.conflictSummary}</p>
                          </div>
                          <button
                            onClick={() => setReviewingConflict(conflict)}
                            className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            View Details
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Source Trust Profiles</h3>
                  <p className="text-sm text-slate-500">Set primary/secondary trust tiers for conflict resolution.</p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Material Title</th>
                        <th className="px-4 py-3">Trust Tier</th>
                        <th className="px-4 py-3">Rationale</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materials.map(mat => {
                        const profile = profiles.find(p => p.materialId === mat.id);
                        return (
                          <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-4 font-medium text-slate-800">
                              {mat.title}
                            </td>
                            <td className="px-4 py-4">
                              {profile ? (
                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                  profile.trustTier === "primary" ? "bg-indigo-100 text-indigo-800" :
                                  profile.trustTier === "secondary" ? "bg-slate-200 text-slate-700" :
                                  "bg-slate-100 text-slate-500"
                                }`}>
                                  {profile.trustTier.toUpperCase()}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-600 max-w-xs truncate">
                              {profile?.rationale || "-"}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={() => setEditingMaterial(mat)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                              >
                                Edit Profile
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {materials.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                            No materials found in this course.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {editingMaterial && user && (
        <EditSourceProfileModal
          isOpen={true}
          onClose={() => setEditingMaterial(null)}
          material={editingMaterial}
          courseId={course.id}
          userId={user.uid}
          currentProfile={profiles.find(p => p.materialId === editingMaterial.id)}
          onSuccess={refresh}
        />
      )}

      {reviewingConflict && user && (
        <ConflictReviewModal
          isOpen={true}
          onClose={() => setReviewingConflict(null)}
          conflict={reviewingConflict}
          courseId={course.id}
          userId={user.uid}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
