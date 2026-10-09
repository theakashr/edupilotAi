"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { assessmentService } from "@/services/assessments/assessmentService";
import { learningService } from "@/services/learning/learningService";

export interface DiagnosticQuestion {
  id: string;
  concept: string;
  conceptCategory: string;
  question: string;
  codeSnippet?: string;
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
}

export const C_PROGRAMMING_DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "q1",
    concept: "Pointers",
    conceptCategory: "Pointers & Memory",
    question: "Which statement best describes a pointer in C?",
    options: [
      { key: "A", text: "A variable that holds the memory address of another variable." },
      { key: "B", text: "A variable that can only store positive integers." },
      { key: "C", text: "A function that automatically allocates dynamic memory." },
      { key: "D", text: "A reserved keyword used to terminate program loops." },
    ],
    correctAnswer: "A",
    explanation: "A pointer is a variable whose value is the direct memory address of another value or variable.",
  },
  {
    id: "q2",
    concept: "Pointers",
    conceptCategory: "Pointers & Memory",
    question: "What is the output of the following code snippet?",
    codeSnippet: "int x = 42;\nint *ptr = &x;\n*ptr = 100;\nprintf(\"%d\", x);",
    options: [
      { key: "A", text: "42" },
      { key: "B", text: "100" },
      { key: "C", text: "Memory address of x" },
      { key: "D", text: "Compilation Error" },
    ],
    correctAnswer: "B",
    explanation: "Dereferencing *ptr assigns 100 directly to the memory location of x, modifying x in place.",
  },
  {
    id: "q3",
    concept: "Arrays",
    conceptCategory: "Core Data Structures",
    question: "In C, if arr is declared as int arr[5], what does the expression 'arr' evaluate to in most contexts?",
    options: [
      { key: "A", text: "The length of the array in bytes" },
      { key: "B", text: "A pointer to the first element (&arr[0])" },
      { key: "C", text: "A copy of all array elements" },
      { key: "D", text: "A null pointer" },
    ],
    correctAnswer: "B",
    explanation: "In most expressions, an array identifier decays into a pointer to its first element (&arr[0]).",
  },
  {
    id: "q4",
    concept: "Arrays",
    conceptCategory: "Core Data Structures",
    question: "Which expression correctly accesses the 4th element of an array 'values' using pointer arithmetic?",
    options: [
      { key: "A", text: "*(values + 3)" },
      { key: "B", text: "*values + 3" },
      { key: "C", text: "&values[4]" },
      { key: "D", text: "values->4" },
    ],
    correctAnswer: "A",
    explanation: "Array indexing is 0-based: values[3] is equivalent to *(values + 3).",
  },
  {
    id: "q5",
    concept: "Functions",
    conceptCategory: "Program Structure",
    question: "How does C pass standard scalar arguments (like int or float) to functions by default?",
    options: [
      { key: "A", text: "Pass by reference" },
      { key: "B", text: "Pass by value" },
      { key: "C", text: "Pass by name" },
      { key: "D", text: "Pass by pointer automatically" },
    ],
    correctAnswer: "B",
    explanation: "C is strictly pass-by-value. To simulate pass-by-reference, addresses must be passed explicitly as pointers.",
  },
  {
    id: "q6",
    concept: "Functions",
    conceptCategory: "Program Structure",
    question: "What happens when a local function variable is returned as a pointer?",
    codeSnippet: "int* createNumber() {\n  int val = 50;\n  return &val;\n}",
    options: [
      { key: "A", text: "The value is safely moved to the heap." },
      { key: "B", text: "Dangling pointer: the stack memory is deallocated upon function return." },
      { key: "C", text: "The variable becomes global automatically." },
      { key: "D", text: "C guarantees stack memory persists until main exits." },
    ],
    correctAnswer: "B",
    explanation: "Local automatic variables are allocated on the stack and invalidated when the function returns.",
  },
  {
    id: "q7",
    concept: "Structures",
    conceptCategory: "Complex Data Types",
    question: "Which operator is used to access a struct member through a pointer to that struct?",
    options: [
      { key: "A", text: "." },
      { key: "B", text: "->" },
      { key: "C", text: "::" },
      { key: "D", text: "#" },
    ],
    correctAnswer: "B",
    explanation: "The arrow operator '->' dereferences the struct pointer and accesses the member (e.g. ptr->name).",
  },
  {
    id: "q8",
    concept: "Structures",
    conceptCategory: "Complex Data Types",
    question: "What is true regarding memory alignment (padding) in C structures?",
    options: [
      { key: "A", text: "sizeof(struct) is always the strict sum of its members' sizes." },
      { key: "B", text: "Compilers insert padding bytes to align members with architecture word boundaries." },
      { key: "C", text: "Padding is only applied when using malloc()." },
      { key: "D", text: "C standard strictly forbids memory padding in structs." },
    ],
    correctAnswer: "B",
    explanation: "Compilers introduce padding between members to satisfy hardware alignment constraints for fast CPU access.",
  },
  {
    id: "q9",
    concept: "Linked Lists",
    conceptCategory: "Dynamic Data Structures",
    question: "What is the time complexity to insert a new node at the head of a singly linked list?",
    options: [
      { key: "A", text: "O(1)" },
      { key: "B", text: "O(N)" },
      { key: "C", text: "O(log N)" },
      { key: "D", text: "O(N^2)" },
    ],
    correctAnswer: "A",
    explanation: "Prepending to the head requires only updating the new node's next pointer and the head reference: O(1).",
  },
  {
    id: "q10",
    concept: "Linked Lists",
    conceptCategory: "Dynamic Data Structures",
    question: "Which function must be called to release dynamically allocated node memory before deleting a node?",
    options: [
      { key: "A", text: "release()" },
      { key: "B", text: "free()" },
      { key: "C", text: "delete()" },
      { key: "D", text: "drop()" },
    ],
    correctAnswer: "B",
    explanation: "In C, memory allocated with malloc, calloc, or realloc must be returned to the heap using free().",
  },
];

interface DiagnosticAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle?: string;
  courseId?: string;
  onComplete?: (score: number) => void;
}

export function DiagnosticAssessmentModal({
  isOpen,
  onClose,
  courseTitle = "C Programming",
  courseId,
  onComplete,
}: DiagnosticAssessmentModalProps) {
  const { user } = useAuth();
  const questions = C_PROGRAMMING_DIAGNOSTIC_QUESTIONS;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scorePercentage, setScorePercentage] = useState(0);
  const [conceptBreakdown, setConceptBreakdown] = useState<
    { concept: string; mastery: string; score: number; total: number }[]
  >([]);

  // Keyboard navigation shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || isSubmitted || isReviewStep) return;

      const q = questions[currentIndex];
      if (e.key === "1" || e.key === "a" || e.key === "A") {
        setAnswers((prev) => ({ ...prev, [q.id]: "A" }));
      } else if (e.key === "2" || e.key === "b" || e.key === "B") {
        setAnswers((prev) => ({ ...prev, [q.id]: "B" }));
      } else if (e.key === "3" || e.key === "c" || e.key === "C") {
        setAnswers((prev) => ({ ...prev, [q.id]: "C" }));
      } else if (e.key === "4" || e.key === "d" || e.key === "D") {
        setAnswers((prev) => ({ ...prev, [q.id]: "D" }));
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
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  const handleSelectOption = (key: "A" | "B" | "C" | "D") => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: key }));
  };

  const handleSubmit = async () => {
    // Grade the diagnostic
    let correctCount = 0;
    const conceptTotals: Record<string, { correct: number; total: number }> = {};

    questions.forEach((q) => {
      if (!conceptTotals[q.concept]) {
        conceptTotals[q.concept] = { correct: 0, total: 0 };
      }
      conceptTotals[q.concept].total += 1;

      if (answers[q.id] === q.correctAnswer) {
        correctCount += 1;
        conceptTotals[q.concept].correct += 1;
      }
    });

    const finalPercent = Math.round((correctCount / questions.length) * 100);
    setScorePercentage(finalPercent);

    const breakdown = Object.entries(conceptTotals).map(([concept, data]) => {
      const pct = Math.round((data.correct / data.total) * 100);
      let mastery = "Developing";
      if (pct >= 80) mastery = "Strong";
      else if (pct >= 50) mastery = "Good";

      return {
        concept,
        mastery,
        score: data.correct,
        total: data.total,
      };
    });

    setConceptBreakdown(breakdown);
    setIsSubmitted(true);
    setIsReviewStep(false);

    // Save attempt if user is authenticated and courseId is present
    if (user?.uid && courseId) {
      try {
        const startRes = await assessmentService.startAssessmentAttempt({
          assessmentId: `diag_${courseId}`,
          courseId,
          studentId: user.uid,
          status: "in_progress",
        });

        if (startRes.success && startRes.data) {
          await assessmentService.completeAssessmentAttempt(startRes.data.id, {
            score: correctCount,
            percentage: finalPercent,
            status: "completed",
          });
        }

        // Persist real mastery score in learning profile and activity log
        await learningService.upsertLearningProfile(user.uid, courseId, {
          overallMastery: finalPercent,
        });

        await learningService.logStudentActivity({
          studentId: user.uid,
          courseId,
          activityType: "quiz_completed",
          referenceId: `diag_${courseId}`,
          metadata: {
            score: correctCount,
            percentage: finalPercent,
            type: "diagnostic",
          },
        });
      } catch {
        // Silently record local state if remote attempt fails
      }
    }

    if (onComplete) {
      onComplete(finalPercent);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setIsReviewStep(false);
    setIsSubmitted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FAF9F8] rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden flex flex-col min-h-[580px] max-h-[92vh] relative animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">{courseTitle}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Diagnostic Level
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {isSubmitted ? "Result Summary" : isReviewStep ? "Review & Complete" : `Question ${currentIndex + 1} of ${questions.length}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isSubmitted && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100/80 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>~15 min</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Close diagnostic"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {!isSubmitted && (
          <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
          {!isSubmitted && !isReviewStep && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Concept Tag */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  Concept: {currentQ.concept}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {currentIndex + 1} / {questions.length}
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug">
                {currentQ.question}
              </h2>

              {/* Code Snippet if applicable */}
              {currentQ.codeSnippet && (
                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
                  <pre>{currentQ.codeSnippet}</pre>
                </div>
              )}

              {/* Answer Option Cards */}
              <div className="space-y-3 pt-2">
                {currentQ.options.map((option) => {
                  const isSelected = answers[currentQ.id] === option.key;
                  return (
                    <button
                      key={option.key}
                      onClick={() => handleSelectOption(option.key)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-start gap-4 group ${
                        isSelected
                          ? "bg-white border-indigo-500 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                          : "bg-white/90 border-slate-200/90 hover:border-slate-300 hover:bg-white shadow-sm hover:scale-[1.01]"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                        }`}
                      >
                        {option.key}
                      </span>
                      <span
                        className={`text-sm pt-0.5 leading-relaxed ${
                          isSelected ? "font-semibold text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Question Navigator Dots */}
              <div className="pt-4 flex items-center justify-center gap-1.5 flex-wrap">
                {questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      title={`Go to Question ${idx + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-200 ${
                        isCurrent
                          ? "w-8 bg-indigo-600 shadow-sm shadow-indigo-500/30"
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
          )}

          {/* Pre-submit Review Step */}
          {isReviewStep && !isSubmitted && (
            <div className="max-w-xl mx-auto py-6 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm border border-indigo-100">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">You&apos;re almost there.</h3>
                <p className="text-sm text-slate-500 mt-1.5">
                  Review your answers or submit your diagnostic assessment to establish your learning baseline.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                  <span className="text-2xl font-bold text-emerald-600">{answeredCount}</span>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">Answered</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                  <span className={`text-2xl font-bold ${unansweredCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    {unansweredCount}
                  </span>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">Unanswered</p>
                </div>
              </div>

              {unansweredCount > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 py-2 px-4 rounded-xl border border-amber-200/60 inline-block">
                  You have {unansweredCount} unanswered questions. You can still submit or go back to review.
                </p>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsReviewStep(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-100 transition-colors"
                >
                  Review Answers
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                >
                  Submit Assessment →
                </button>
              </div>
            </div>
          )}

          {/* Result View */}
          {isSubmitted && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Diagnostic Complete ✨
                </span>
                <h3 className="text-2xl font-bold text-slate-900">
                  You completed your {courseTitle} diagnostic.
                </h3>
                <p className="text-sm text-slate-500">
                  Here is your baseline knowledge profile across core concepts.
                </p>
              </div>

              {/* Large Circular / Score Baseline Display */}
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40 rounded-full bg-gradient-to-tr from-indigo-500/10 via-violet-500/10 to-transparent flex items-center justify-center border-4 border-indigo-600 shadow-inner">
                  <div className="text-center">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                      {scorePercentage}%
                    </span>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-indigo-600 mt-0.5">
                      Current Baseline
                    </p>
                  </div>
                </div>
              </div>

              {/* Knowledge Map Breakdown */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Your Knowledge Map
                </h4>

                <div className="space-y-3.5">
                  {conceptBreakdown.map((item) => (
                    <div key={item.concept} className="flex items-center justify-between gap-4">
                      <div className="w-32 shrink-0">
                        <span className="text-sm font-medium text-slate-800">{item.concept}</span>
                      </div>

                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.mastery === "Strong"
                              ? "bg-emerald-500"
                              : item.mastery === "Good"
                              ? "bg-indigo-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.round((item.score / item.total) * 100)}%` }}
                        />
                      </div>

                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 border ${
                          item.mastery === "Strong"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : item.mastery === "Good"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {item.mastery}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insight Card */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/40 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-indigo-900 font-semibold text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>✦ EduPilot Insight</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  You currently show stronger performance in Arrays and Functions. Your diagnostic indicates that Pointers may need additional practice. This is based on your diagnostic results.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retake Diagnostic
                </button>
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                >
                  <BookOpen className="w-4 h-4" />
                  Continue to Learning Path →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Question Navigation) */}
        {!isSubmitted && !isReviewStep && (
          <div className="px-6 py-4 bg-white/90 backdrop-blur-sm border-t border-slate-200/80 flex items-center justify-between sticky bottom-0 z-20">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Press 1–4 to pick • Enter to continue
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.02]"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsReviewStep(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
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
