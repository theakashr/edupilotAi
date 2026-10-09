"use client";

import { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
} from "lucide-react";
import type { Assessment, Question } from "@/types";

interface PreviewAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Partial<Assessment>;
}

export function PreviewAssessmentModal({
  isOpen,
  onClose,
  assessment,
}: PreviewAssessmentModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  if (!isOpen || !assessment) return null;

  const questions: Question[] = assessment.questions || [];
  const currentQ = questions[currentIndex];
  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col min-h-[520px] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Banner: Preview Notice */}
        <div className="px-6 py-2.5 bg-amber-500 text-amber-950 text-xs font-semibold flex items-center justify-between border-b border-amber-600/20">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>Teacher Interactive Preview Mode (Student View)</span>
          </div>
          <button
            onClick={onClose}
            className="text-amber-950/80 hover:text-amber-950 font-bold"
          >
            Exit Preview
          </button>
        </div>

        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                {assessment.title || "Untitled Assessment"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {assessment.type || "Diagnostic"}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {assessment.durationMinutes && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{assessment.durationMinutes} min</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
          {questions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No questions configured yet.
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {currentQ.conceptName && (
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 inline-block">
                  Concept: {currentQ.conceptName}
                </span>
              )}

              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug">
                {currentQ.text || "Untitled Question"}
              </h3>

              <div className="space-y-3 pt-2">
                {currentQ.options.map((optText: string, optIndex: number) => {
                  const letter = String.fromCharCode(65 + optIndex);
                  const isSelected = selectedAnswers[currentQ.id || currentIndex] === optIndex;
                  const isTeacherAuthoritativeCorrect = currentQ.correctOptionIndex === optIndex;

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      onClick={() =>
                        setSelectedAnswers((prev) => ({
                          ...prev,
                          [currentQ.id || currentIndex]: optIndex,
                        }))
                      }
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-400"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {letter}
                      </span>
                      <div className="flex-1">
                        <span className="text-sm text-slate-800 leading-relaxed block">
                          {optText || `Option ${letter}`}
                        </span>
                        {/* In preview mode, subtle badge for teacher reference */}
                        {isTeacherAuthoritativeCorrect && (
                          <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">
                            ✓ (Marked as correct answer key)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {currentQ.explanation && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                  <span className="font-bold text-slate-700">Configured Explanation:</span>{" "}
                  {currentQ.explanation}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs text-slate-400">
            {currentIndex + 1} of {questions.length}
          </span>

          <button
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentIndex >= questions.length - 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
