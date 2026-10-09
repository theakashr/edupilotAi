"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  BrainCircuit,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Award,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { AdaptiveActivity, AdaptivePlanResult, IdentifiedLearningGap } from "@/types";

interface AdaptiveLearningPlanProps {
  courseId: string;
  courseTitle?: string;
  onLaunchAssessment?: (assessmentId: string) => void;
  onOpenMaterial?: (materialId: string) => void;
}

export function AdaptiveLearningPlan({
  courseId,
  courseTitle,
  onLaunchAssessment,
  onOpenMaterial,
}: AdaptiveLearningPlanProps) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [replanning, setReplanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<AdaptivePlanResult | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchPlan() {
      if (!courseId) return;
      if (authLoading) return;
      if (!user?.uid) {
        setLoading(false);
        setError("Please sign in to view your personalized learning plan.");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/learning/plan?courseId=${courseId}&userId=${user.uid}`, {
          headers: {
            "x-user-id": user.uid,
          },
        });

        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          throw new Error(data.error || "Failed to load adaptive learning plan.");
        }

        setPlan(data.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load plan.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchPlan();

    return () => {
      ignore = true;
    };
  }, [courseId, user?.uid, authLoading]);

  const handleManualReplan = async () => {
    if (!user?.uid) return;
    try {
      setReplanning(true);
      const res = await fetch("/api/learning/replan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({ courseId, userId: user.uid }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to replan.");
      }

      setPlan(data.data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to replan.");
    } finally {
      setReplanning(false);
    }
  };

  const handleCompleteItem = async (activity: AdaptiveActivity) => {
    if (!user?.uid) return;
    try {
      setCompletingId(activity.id);
      const res = await fetch(`/api/learning/plan/item/${activity.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({ courseId, userId: user.uid }),
      });

      if (res.ok) {
        // Mark locally
        setPlan((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            activities: prev.activities.map((a) =>
              a.id === activity.id ? { ...a, status: "completed" } : a
            ),
          };
        });
      }
    } catch (err) {
      console.warn("Failed to complete activity:", err);
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-4 shadow-xs animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-6 w-48 bg-slate-200 rounded-xl" />
          <div className="h-8 w-24 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-32 bg-slate-100 rounded-2xl" />
        <div className="space-y-2">
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 text-center space-y-3 shadow-xs">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800">Adaptive Plan Unavailable</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {error || "Could not retrieve your personalized learning plan. Please try refreshing."}
        </p>
        <button
          onClick={handleManualReplan}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Replan</span>
        </button>
      </div>
    );
  }

  const activities = plan.activities || [];
  const pendingActivities = activities.filter((a) => a.status !== "completed");
  const completedActivities = activities.filter((a) => a.status === "completed");
  const currentFocus = pendingActivities.length > 0 ? pendingActivities[0] : null;
  const subsequentActivities = pendingActivities.slice(1);
  const gaps = plan.gaps || [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
      {/* ─── Top Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Dynamic Adaptive Path
            </span>
            {plan.overallMastery > 0 && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Course Mastery: {plan.overallMastery}%
              </span>
            )}
            {gaps.length > 0 && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                {gaps.length} Active {gaps.length === 1 ? "Gap" : "Gaps"} Diagnosed
              </span>
            )}
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Personalized Learning Plan
          </h3>
          <p className="text-xs text-slate-500">
            {courseTitle ? `${courseTitle} • ` : ""}
            {plan.reasonSummary || "Continuously calibrated using your verified assessment results and curriculum prerequisites."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualReplan}
          disabled={replanning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors shrink-0 disabled:opacity-50"
          title="Recalculate learning recommendations with latest evidence"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${replanning ? "animate-spin text-indigo-600" : ""}`} />
          <span>{replanning ? "Recalculating..." : "Refresh Plan"}</span>
        </button>
      </div>

      {/* ─── Active Gaps Notice (if any) ──────────────────────────────────── */}
      {gaps.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Diagnosed Learning Bottlenecks ({gaps.length})
            </span>
            <span className="text-[11px] text-amber-700 font-medium">Prioritized below</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {gaps.map((g: IdentifiedLearningGap) => (
              <div
                key={g.conceptId}
                className="inline-flex items-center gap-1.5 text-xs bg-white/80 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-xl shadow-2xs"
              >
                <span className="font-semibold">{g.conceptName}</span>
                <span className="text-[10px] text-amber-600 font-mono">
                  {g.currentMastery}%
                </span>
                {g.isPrerequisiteGap && (
                  <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold uppercase">
                    Prereq Root
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Hero Card: Current Priority Activity ─────────────────────────── */}
      {currentFocus ? (
        <div className="rounded-2xl border-2 border-indigo-600/30 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                1
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-100 shadow-2xs">
                Current Priority Focus
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  currentFocus.priority === "high"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : currentFocus.priority === "medium"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {currentFocus.priority} Priority
              </span>
            </div>

            {currentFocus.isPrerequisiteReinforcement && (
              <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 flex items-center gap-1 self-start sm:self-auto">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                <span>Foundational Prerequisite</span>
              </span>
            )}
          </div>

          <div>
            <h4 className="text-lg font-bold text-slate-900">
              {currentFocus.title}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {currentFocus.description}
            </p>
          </div>

          {/* Rationale & Evidence Box */}
          <div className="bg-white/90 rounded-xl p-3.5 border border-indigo-100 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
                Why this activity was recommended
              </span>
              <button
                type="button"
                onClick={() =>
                  setExpandedActivityId(
                    expandedActivityId === currentFocus.id ? null : currentFocus.id
                  )
                }
                className="text-slate-400 hover:text-slate-600 text-[11px] flex items-center gap-1"
              >
                <span>{expandedActivityId === currentFocus.id ? "Hide Evidence" : "Inspect Evidence"}</span>
                {expandedActivityId === currentFocus.id ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-slate-600 leading-relaxed">{currentFocus.reason}</p>

            {expandedActivityId === currentFocus.id && currentFocus.evidence.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Assessment Evidence
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
                  {currentFocus.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Resource & Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {currentFocus.resourceAvailable ? (
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    Linked Resource: <strong className="text-slate-800">{currentFocus.resourceTitle || "Course Resource"}</strong>
                  </span>
                </div>
              ) : (
                <span className="text-amber-600 font-medium">
                  No direct document uploaded yet. Review concept notes.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {/* Launch resource action */}
              {currentFocus.activityType === "practice" || currentFocus.activityType === "quiz" ? (
                currentFocus.referenceId && onLaunchAssessment ? (
                  <button
                    type="button"
                    onClick={() => onLaunchAssessment(currentFocus.referenceId!)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-xs transition-colors"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Launch Assessment</span>
                  </button>
                ) : (
                  <Link
                    href="/student/assessments"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-xs transition-colors"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>View Assessments</span>
                  </Link>
                )
              ) : currentFocus.referenceId && onOpenMaterial ? (
                <button
                  type="button"
                  onClick={() => onOpenMaterial(currentFocus.referenceId!)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-xs transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Read Material</span>
                </button>
              ) : (
                <Link
                  href="/student/learning"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-xs transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open Learning Material</span>
                </Link>
              )}

              {/* Mark Completed */}
              <button
                type="button"
                onClick={() => handleCompleteItem(currentFocus)}
                disabled={completingId === currentFocus.id}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
              >
                {completingId === currentFocus.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>Mark Completed</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / All caught up state */
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">All Recommended Activities Completed!</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You have addressed all active recommendations. Take a new diagnostic or practice assessment to evaluate advanced curriculum topics.
          </p>
        </div>
      )}

      {/* ─── Subsequent Prioritized Activities List ───────────────────────── */}
      {subsequentActivities.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Up Next in Your Path ({subsequentActivities.length})
            </span>
            <span className="text-xs text-slate-400">Ordered by prerequisite priority</span>
          </div>

          <div className="space-y-2">
            {subsequentActivities.map((act, idx) => (
              <div
                key={act.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 2}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {act.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full border ${
                          act.priority === "high"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : act.priority === "medium"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {act.priority}
                      </span>
                      {act.isPrerequisiteReinforcement && (
                        <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold uppercase">
                          Prereq
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{act.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCompleteItem(act)}
                    disabled={completingId === act.id}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white transition-colors"
                    title="Mark as completed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <Link
                    href="/student/learning"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Historical Completed Activities (if any) ─────────────────────── */}
      {completedActivities.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium">
            ✅ {completedActivities.length} {completedActivities.length === 1 ? "activity" : "activities"} completed in this course.
          </span>
        </div>
      )}
    </div>
  );
}
