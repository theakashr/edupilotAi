"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type {
  SanitizedQuestion,
  QuestionAttemptResult,
  ConceptDiagnosticSummary,
  AssessmentAttempt,
} from "@/types";

interface TakeAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentId: string;
  courseTitle?: string;
  onCompleted?: () => void;
}

export function TakeAssessmentModal({
  isOpen,
  onClose,
  assessmentId,
  courseTitle,
  onCompleted,
}: TakeAssessmentModalProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assessment definition
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>();
  const [questions, setQuestions] = useState<SanitizedQuestion[]>([]);

  // Taking state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Results state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [totalMarks, setTotalMarks] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [results, setResults] = useState<QuestionAttemptResult[]>([]);
  const [conceptBreakdown, setConceptBreakdown] = useState<ConceptDiagnosticSummary[]>([]);

  const storageKey = user?.uid
    ? `edupilot_draft_ass_${assessmentId}_${user.uid}`
    : null;

  // 1. Fetch sanitized assessment definition & check if already completed
  useEffect(() => {
    let ignore = false;

    async function fetchAssessment() {
      if (!isOpen || !assessmentId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/assessments/${assessmentId}?userId=${user.uid}`, {
          headers: {
            "x-user-id": user.uid,
          },
        });

        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          throw new Error(data.error || "Failed to load assessment.");
        }

        const ass = data.data;
        setAssessmentTitle(ass.title || "Diagnostic Assessment");
        setInstructions(ass.instructions || "");
        setDurationMinutes(ass.durationMinutes);
        setQuestions(ass.questions || []);

        // If student has already completed an attempt, display past result!
        if (data.completedAttempt) {
          const past: AssessmentAttempt = data.completedAttempt;
          setScore(past.score || 0);
          setTotalMarks(past.totalMarks || ass.totalMarks || 0);
          setPercentage(past.percentage || 0);
          setResults(past.results || []);
          setConceptBreakdown(past.conceptBreakdown || []);
          setIsSubmitted(true);
        } else {
          // Restore draft answers from localStorage if available
          if (storageKey) {
            try {
              const saved = localStorage.getItem(storageKey);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === "object") {
                  setAnswers(parsed);
                }
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load assessment.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchAssessment();

    return () => {
      ignore = true;
    };
  }, [isOpen, assessmentId, user?.uid, storageKey]);

  // Persist answers to localStorage upon change for resilience against browser refresh
  useEffect(() => {
    if (storageKey && !isSubmitted && Object.keys(answers).length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(answers));
      } catch {
        // ignore
      }
    }
  }, [answers, storageKey, isSubmitted]);

  // Keyboard navigation shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || isSubmitted || isReviewStep || questions.length === 0) return;

      const q = questions[currentIndex];
      if (!q) return;

      if (e.key === "1" || e.key === "a" || e.key === "A") {
        setAnswers((prev) => ({ ...prev, [q.id]: 0 }));
      } else if (e.key === "2" || e.key === "b" || e.key === "B") {
        setAnswers((prev) => ({ ...prev, [q.id]: 1 }));
      } else if (e.key === "3" || e.key === "c" || e.key === "C") {
        setAnswers((prev) => ({ ...prev, [q.id]: 2 }));
      } else if (e.key === "4" || e.key === "d" || e.key === "D") {
        setAnswers((prev) => ({ ...prev, [q.id]: 3 }));
      } else if (e.key === "Enter") {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsReviewStep(true);
        }
      }
    },
    [isOpen, isSubmitted, isReviewStep, currentIndex, questions]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const progressPercent =
    questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  const handleSelectOption = (optIndex: number) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optIndex }));
  };

  const handleSubmit = async () => {
    if (!user?.uid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          userId: user.uid,
          answers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit assessment.");
      }

      setScore(data.score);
      setTotalMarks(data.totalMarks);
      setPercentage(data.percentage);
      setResults(data.results || []);
      setConceptBreakdown(data.conceptBreakdown || []);
      setIsSubmitted(true);
      setIsReviewStep(false);

      // Clean local storage draft
      if (storageKey) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }

      if (onCompleted) {
        onCompleted();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit assessment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FAF9F8] rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col min-h-[580px] max-h-[92vh] relative animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-white/90 backdrop-blur-sm border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {assessmentTitle || courseTitle || "Assessment"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Diagnostic
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {isSubmitted
                  ? "Calibrated Results"
                  : isReviewStep
                  ? "Submission Confirmation"
                  : `Question ${currentIndex + 1} of ${questions.length}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isSubmitted && durationMinutes && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{durationMinutes} min</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {!isSubmitted && questions.length > 0 && (
          <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Loading assessment questions...</span>
            </div>
          ) : error ? (
            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 my-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Assessment Unavailable</span>
                <span>{error}</span>
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              No questions found for this assessment.
            </div>
          ) : !isSubmitted && !isReviewStep ? (
            /* Active Question Taking View */
            <div className="max-w-2xl mx-auto space-y-6">
              {currentIndex === 0 && instructions && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-900 leading-relaxed">
                  <span className="font-semibold text-indigo-950">Instructions: </span>
                  {instructions}
                </div>
              )}
              {/* Question metadata badge */}
              <div className="flex items-center justify-between">
                {currentQ.conceptName ? (
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    Concept: {currentQ.conceptName}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-400">
                    Question {currentIndex + 1}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-medium">
                  {currentIndex + 1} / {questions.length}
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug">
                {currentQ.text}
              </h2>

              {/* Answer Option Buttons */}
              <div className="space-y-3 pt-2">
                {currentQ.options.map((optText: string, optIndex: number) => {
                  const letter = String.fromCharCode(65 + optIndex);
                  const isSelected = answers[currentQ.id] === optIndex;

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      onClick={() => handleSelectOption(optIndex)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-start gap-4 group ${
                        isSelected
                          ? "bg-white border-indigo-500 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                          : "bg-white/90 border-slate-200/90 hover:border-slate-300 hover:bg-white shadow-2xs hover:scale-[1.01]"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                        }`}
                      >
                        {letter}
                      </span>
                      <span
                        className={`text-sm pt-0.5 leading-relaxed ${
                          isSelected ? "font-semibold text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {optText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigator dots */}
              <div className="pt-4 flex items-center justify-center gap-1.5 flex-wrap">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      title={`Jump to question ${idx + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-200 ${
                        isCurrent
                          ? "w-8 bg-indigo-600 shadow-xs shadow-indigo-500/30"
                          : isAnswered
                          ? "w-2.5 bg-indigo-300 hover:bg-indigo-400"
                          : "w-2.5 bg-slate-200 hover:bg-slate-300"
                      }`}
                      aria-label={`Jump to question ${idx + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          ) : isReviewStep && !isSubmitted ? (
            /* Pre-submission Confirmation View */
            <div className="max-w-xl mx-auto py-6 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs border border-indigo-100">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Ready to submit your assessment?
                </h3>
                <p className="text-sm text-slate-500 mt-1.5">
                  Confirm your responses. Scores and concept diagnostics are verified authoritatively on the server.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
                  <span className="text-2xl font-bold text-emerald-600">{answeredCount}</span>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">Answered</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
                  <span
                    className={`text-2xl font-bold ${
                      unansweredCount > 0 ? "text-amber-600" : "text-slate-400"
                    }`}
                  >
                    {unansweredCount}
                  </span>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">Unanswered</p>
                </div>
              </div>

              {unansweredCount > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 py-2 px-4 rounded-xl border border-amber-200/60 inline-block">
                  You have {unansweredCount} unanswered questions. You may go back to answer them or submit now.
                </p>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewStep(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-100 transition-colors"
                >
                  Review Answers
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Grading...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Submit</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Detailed Calibrated Results View */
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Diagnostic Baseline Complete ✨
                </span>
                <h3 className="text-2xl font-bold text-slate-900">
                  Assessment Results &amp; Knowledge Profile
                </h3>
                <p className="text-sm text-slate-500">
                  Evaluated deterministically across core course concepts.
                </p>
              </div>

              {/* Large Score Circular Gauge */}
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40 rounded-full bg-gradient-to-tr from-indigo-500/10 via-violet-500/10 to-transparent flex items-center justify-center border-4 border-indigo-600 shadow-inner">
                  <div className="text-center">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                      {percentage}%
                    </span>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-indigo-600 mt-0.5">
                      {score} / {totalMarks || questions.length} Points
                    </p>
                  </div>
                </div>
              </div>

              {/* Concept Diagnostic Breakdown */}
              {conceptBreakdown.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Concept Diagnostic Profile
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Evidence-Grounded
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {conceptBreakdown.map((item) => (
                      <div
                        key={item.conceptId}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-slate-800">
                            {item.conceptName}
                          </span>

                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                              item.status === "demonstrated_understanding"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : item.status === "potential_difficulty"
                                ? "bg-red-50 text-red-700 border-red-100"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {item.status === "demonstrated_understanding"
                              ? "Demonstrated Understanding"
                              : item.status === "potential_difficulty"
                              ? "Potential Difficulty"
                              : item.status === "insufficient_evidence"
                              ? "Insufficient Evidence"
                              : "Not Assessed"}
                          </span>
                        </div>

                        {item.details && (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {item.details}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question Feedback Breakdown */}
              {results.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Question Review &amp; Explanations
                  </h4>

                  <div className="space-y-3">
                    {results.map((r, idx) => {
                      const selectedLetter =
                        r.selectedOptionIndex !== null
                          ? String.fromCharCode(65 + r.selectedOptionIndex)
                          : "None";
                      const correctLetter =
                        r.correctOptionIndex !== undefined
                          ? String.fromCharCode(65 + r.correctOptionIndex)
                          : undefined;

                      return (
                        <div
                          key={r.questionId || idx}
                          className={`p-4 rounded-xl border ${
                            r.isCorrect
                              ? "bg-emerald-50/30 border-emerald-200"
                              : "bg-red-50/30 border-red-200"
                          } space-y-2`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-bold text-slate-800">
                              Q{idx + 1}: {r.questionText}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                                r.isCorrect
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {r.isCorrect ? "Correct" : "Incorrect"}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4 pt-1">
                            <span>
                              Your response: <b>Option {selectedLetter}</b>
                            </span>
                            {correctLetter && (
                              <span>
                                Correct answer: <b>Option {correctLetter}</b>
                              </span>
                            )}
                          </div>

                          {r.explanation && (
                            <p className="text-xs text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100 mt-1 italic">
                              &ldquo;{r.explanation}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Close / Continue Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Question Navigation) */}
        {!isSubmitted && !isReviewStep && questions.length > 0 && (
          <div className="px-6 py-4 bg-white/95 backdrop-blur-sm border-t border-slate-200/80 flex items-center justify-between sticky bottom-0 z-20">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Press 1–4 to choose • Enter to proceed
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.01]"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsReviewStep(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
              >
                Review &amp; Finish
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
