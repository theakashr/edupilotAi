"use client";

import { useState, useEffect } from "react";
import {
  X,
  Users,
  Search,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Assessment, AssessmentAttempt, CourseMember } from "@/types";
import { assessmentService } from "@/services/assessments/assessmentService";
import { courseService } from "@/services/courses/courseService";

interface AssessmentResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment;
}

export function AssessmentResultsModal({
  isOpen,
  onClose,
  assessment,
}: AssessmentResultsModalProps) {
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [members, setMembers] = useState<CourseMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadResults() {
      if (!isOpen || !assessment.id) return;

      try {
        setLoading(true);
        const [attRes, memRes] = await Promise.all([
          assessmentService.listAssessmentAttempts(assessment.id),
          courseService.listCourseMembers(assessment.courseId),
        ]);

        if (ignore) return;

        if (attRes.success && attRes.data) {
          setAttempts(attRes.data);
        } else {
          setAttempts([]);
        }

        if (memRes.success && memRes.data) {
          setMembers(memRes.data);
        } else {
          setMembers([]);
        }
      } catch (err) {
        console.error("Failed to load results:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadResults();

    return () => {
      ignore = true;
    };
  }, [isOpen, assessment.id, assessment.courseId]);

  if (!isOpen) return null;

  // Filter completed attempts
  const completedAttempts = attempts.filter((a) => a.status === "completed");
  const attemptedStudentIds = new Set(attempts.map((a) => a.studentId));

  // Identify unattempted enrolled students
  const unattemptedMembers = members.filter(
    (m) => !attemptedStudentIds.has(m.studentId)
  );

  // Compute aggregate metrics
  const totalAttempts = completedAttempts.length;
  const avgScore =
    totalAttempts > 0
      ? Math.round(
          completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
            totalAttempts
        )
      : 0;
  const passCount = completedAttempts.filter((a) => (a.percentage || 0) >= 60).length;
  const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;

  // Concept-level class aggregate analytics
  const classConceptStats: Record<
    string,
    { name: string; totalQuestions: number; totalCorrect: number; status: string }
  > = {};

  completedAttempts.forEach((att) => {
    (att.conceptBreakdown || []).forEach((c) => {
      if (!classConceptStats[c.conceptId]) {
        classConceptStats[c.conceptId] = {
          name: c.conceptName,
          totalQuestions: 0,
          totalCorrect: 0,
          status: "evaluating",
        };
      }
      classConceptStats[c.conceptId].totalQuestions += c.questionsCount;
      classConceptStats[c.conceptId].totalCorrect += c.correctCount;
    });
  });

  const conceptSummaries = Object.values(classConceptStats).map((item) => {
    const pct =
      item.totalQuestions > 0
        ? Math.round((item.totalCorrect / item.totalQuestions) * 100)
        : 0;

    let tag = "Developing";
    let colorClass = "bg-amber-50 text-amber-700 border-amber-200";

    if (item.totalQuestions < 2) {
      tag = "Insufficient Evidence";
      colorClass = "bg-slate-50 text-slate-700 border-slate-200";
    } else if (pct >= 70) {
      tag = "Class Strength";
      colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (pct < 60) {
      tag = "Potential Class Difficulty";
      colorClass = "bg-red-50 text-red-700 border-red-200";
    }

    return {
      ...item,
      percentage: pct,
      tag,
      colorClass,
    };
  });

  // Filter attempts by search
  const filteredAttempts = completedAttempts.filter((att) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      att.studentName?.toLowerCase().includes(q) ||
      att.studentEmail?.toLowerCase().includes(q) ||
      att.studentId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Diagnostic Results &amp; Analytics
              </span>
              <span className="text-xs text-slate-400 capitalize">
                {assessment.type} &bull; {assessment.difficulty}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {assessment.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Enrolled
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {members.length}
              </span>
              <span className="text-[11px] text-slate-400">Class roster size</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block">
                Submissions
              </span>
              <span className="text-2xl font-extrabold text-indigo-900 mt-1 block">
                {completedAttempts.length}
              </span>
              <span className="text-[11px] text-indigo-600">
                {members.length > 0
                  ? `${Math.round((completedAttempts.length / members.length) * 100)}% completion`
                  : "0%"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
                Average Score
              </span>
              <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">
                {avgScore}%
              </span>
              <span className="text-[11px] text-emerald-600">Calibrated baseline</span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider block">
                Benchmark Rate
              </span>
              <span className="text-2xl font-extrabold text-purple-900 mt-1 block">
                {passRate}%
              </span>
              <span className="text-[11px] text-purple-600">&ge;60% target met</span>
            </div>
          </div>

          {/* Concept-Level Diagnostics */}
          {conceptSummaries.length > 0 && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Curriculum Concept Diagnostics
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {conceptSummaries.map((c) => (
                  <div
                    key={c.name}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{c.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.totalCorrect} of {c.totalQuestions} questions correct ({c.percentage}%)
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${c.colorClass}`}
                    >
                      {c.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student Attempts Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900">
                Student Submissions ({filteredAttempts.length})
              </h3>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter student..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Loading student attempts...
              </div>
            ) : filteredAttempts.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-sm">
                No student submissions recorded for this assessment yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {filteredAttempts.map((att) => {
                  const isExpanded = expandedAttemptId === att.id;
                  const dateStr = att.submittedAt?.toDate
                    ? att.submittedAt.toDate().toLocaleString()
                    : "Recently";

                  return (
                    <div key={att.id} className="bg-white">
                      <div
                        onClick={() =>
                          setExpandedAttemptId(isExpanded ? null : att.id)
                        }
                        className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {att.studentName?.[0]?.toUpperCase() || "S"}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {att.studentName || "Student"}
                            </h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{att.studentEmail || att.studentId}</span>
                              <span>&bull;</span>
                              <span>{dateStr}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="font-mono text-base font-bold text-slate-900">
                              {att.score} / {att.totalMarks || assessment.totalMarks}
                            </span>
                            <span
                              className={`text-xs font-semibold ml-2 px-2 py-0.5 rounded-full ${
                                (att.percentage || 0) >= 70
                                  ? "bg-emerald-50 text-emerald-700"
                                  : (att.percentage || 0) >= 50
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {att.percentage}%
                            </span>
                          </div>

                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Question Breakdown */}
                      {isExpanded && (
                        <div className="p-5 bg-slate-50/80 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                          {/* Student Concept Profile */}
                          {att.conceptBreakdown && att.conceptBreakdown.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Concept Diagnostic Profile
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {att.conceptBreakdown.map((cb) => (
                                  <div
                                    key={cb.conceptId}
                                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between"
                                  >
                                    <span className="font-medium text-slate-700">
                                      {cb.conceptName}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                                        cb.status === "demonstrated_understanding"
                                          ? "bg-emerald-50 text-emerald-700"
                                          : cb.status === "potential_difficulty"
                                          ? "bg-red-50 text-red-700"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {cb.status.replace(/_/g, " ")} ({cb.correctCount}/{cb.questionsCount})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Question Results */}
                          {att.results && att.results.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Question Responses ({att.results.length})
                              </h5>
                              <div className="space-y-2">
                                {att.results.map((r, rIdx) => {
                                  const selectedLetter =
                                    r.selectedOptionIndex !== null
                                      ? String.fromCharCode(65 + r.selectedOptionIndex)
                                      : "None";
                                  const correctLetter =
                                    r.correctOptionIndex !== undefined
                                      ? String.fromCharCode(65 + r.correctOptionIndex)
                                      : "-";

                                  return (
                                    <div
                                      key={r.questionId || rIdx}
                                      className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-start justify-between gap-3"
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-800">
                                            Q{rIdx + 1}:
                                          </span>
                                          <span className="text-slate-700">
                                            {r.questionText}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 flex items-center gap-3">
                                          <span>
                                            Selected: <b>{selectedLetter}</b>
                                          </span>
                                          <span>
                                            Correct: <b>{correctLetter}</b>
                                          </span>
                                          {r.explanation && (
                                            <span className="italic">
                                              &ldquo;{r.explanation}&rdquo;
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <span
                                        className={`px-2 py-0.5 rounded-md font-bold shrink-0 text-[10px] ${
                                          r.isCorrect
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {r.isCorrect ? "+1 pt" : "0 pt"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Unattempted Enrolled Students */}
          {unattemptedMembers.length > 0 && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Students Not Yet Attempted ({unattemptedMembers.length})
                </h4>
                <span className="text-xs text-slate-400">Enrolled in course</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {unattemptedMembers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    <span>{m.studentId}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Close Results
          </button>
        </div>
      </div>
    </div>
  );
}
