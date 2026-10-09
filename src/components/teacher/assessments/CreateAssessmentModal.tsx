"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
} from "lucide-react";
import type { Concept, Question, AssessmentType, AssessmentDifficulty, Assessment } from "@/types";
import { assessmentService } from "@/services/assessments/assessmentService";

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  teacherId: string;
  teacherName?: string;
  concepts: Concept[];
  onCreated: (assessment: Assessment) => void;
  onPreview?: (draft: Partial<Assessment>) => void;
}

export function CreateAssessmentModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  teacherId,
  teacherName,
  concepts,
  onCreated,
  onPreview,
}: CreateAssessmentModalProps) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [type, setType] = useState<AssessmentType>("diagnostic");
  const [difficulty, setDifficulty] = useState<AssessmentDifficulty>("medium");
  const [durationMinutes, setDurationMinutes] = useState<number>(20);
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [showExplanations, setShowExplanations] = useState(true);

  // Question list state
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "q_init_1",
      text: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      explanation: "",
      conceptId: concepts[0]?.id || "",
      conceptName: concepts[0]?.name || "",
      points: 1,
    },
  ]);

  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length + 1}`,
        text: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        explanation: "",
        conceptId: concepts[0]?.id || "",
        conceptName: concepts[0]?.name || "",
        points: 1,
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, text } : q))
    );
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const newOpts = [...q.options];
        newOpts[optIndex] = text;
        return { ...q, options: newOpts };
      })
    );
  };

  const handleCorrectOptionChange = (qIndex: number, correctOptionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, correctOptionIndex } : q))
    );
  };

  const handleExplanationChange = (qIndex: number, explanation: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, explanation } : q))
    );
  };

  const handleConceptChange = (qIndex: number, conceptId: string) => {
    const concept = concepts.find((c) => c.id === conceptId);
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, conceptId, conceptName: concept?.name || "" }
          : q
      )
    );
  };

  const toggleConceptSelection = (conceptId: string) => {
    setSelectedConceptIds((prev) =>
      prev.includes(conceptId)
        ? prev.filter((id) => id !== conceptId)
        : [...prev, conceptId]
    );
  };

  // Agnes AI Assistant Question Generation
  const handleGenerateAiQuestions = async () => {
    try {
      setIsAiGenerating(true);
      setError(null);
      setAiNotice(null);

      const res = await fetch("/api/ai/assessments/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": teacherId,
        },
        body: JSON.stringify({
          courseId,
          conceptIds: selectedConceptIds.length > 0 ? selectedConceptIds : undefined,
          count: 4,
          difficulty,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate questions with AI.");
      }

      if (data.questions && Array.isArray(data.questions)) {
        // Filter out initial empty question if user hasn't typed anything
        const filteredExisting = questions.filter(
          (q) => q.text.trim().length > 0 || q.options.some((o: string) => o.trim().length > 0)
        );

        setQuestions([...filteredExisting, ...data.questions]);
        setAiNotice(data.message || "AI questions drafted! Please review and approve before publishing.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI generation failed.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const validateAssessment = (): string | null => {
    if (!title.trim()) return "Assessment title is required.";
    if (questions.length === 0) return "At least one question is required.";

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        return `Question ${i + 1} text is empty.`;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          return `Question ${i + 1}, Option ${String.fromCharCode(65 + j)} is empty.`;
        }
      }
    }

    return null;
  };

  const handleSave = async (status: "draft" | "published") => {
    const validationError = validateAssessment();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const totalMarks = questions.reduce((sum, q) => sum + (q.points || 1), 0);

      // Collect all mapped concept IDs
      const uniqueConceptIds = Array.from(
        new Set([
          ...selectedConceptIds,
          ...questions.map((q) => q.conceptId).filter(Boolean) as string[],
        ])
      );

      const createRes = await assessmentService.createAssessment({
        courseId,
        teacherId,
        teacherName: teacherName || "Course Instructor",
        courseTitle,
        title: title.trim(),
        instructions: instructions.trim() || undefined,
        type,
        difficulty,
        totalMarks,
        durationMinutes: durationMinutes > 0 ? durationMinutes : undefined,
        conceptIds: uniqueConceptIds,
        questions,
        feedbackSettings: {
          showCorrectAnswers,
          showExplanations,
        },
        status,
      });

      if (!createRes.success) {
        throw new Error(createRes.error);
      }
      if (!createRes.data) {
        throw new Error("Failed to save assessment.");
      }

      onCreated(createRes.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create assessment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviewClick = () => {
    const validationError = validateAssessment();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (onPreview) {
      onPreview({
        title,
        instructions,
        type,
        difficulty,
        durationMinutes,
        questions,
        feedbackSettings: {
          showCorrectAnswers,
          showExplanations,
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Course Assessment
              </span>
              <span className="text-xs text-slate-400 font-medium">{courseTitle}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Create Diagnostic Assessment
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
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {aiNotice && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm flex items-start gap-3">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
              <span>{aiNotice}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Assessment Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Diagnostic Baseline: Conceptual Foundations"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Student Instructions
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Answer each question based on your current knowledge. No outside materials permitted."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssessmentType)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="diagnostic">Diagnostic Assessment</option>
                <option value="quiz">Checkpoint Quiz</option>
                <option value="practice">Practice Evaluation</option>
                <option value="exam">Official Exam</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as AssessmentDifficulty)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="easy">Easy (Foundational)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="hard">Hard (Advanced)</option>
                <option value="mixed">Mixed (Comprehensive)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCorrectAnswers}
                    onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Show answers after submit</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showExplanations}
                    onChange={(e) => setShowExplanations(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Show explanations</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Associated Course Concepts */}
          {concepts.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Associate Course Concepts ({concepts.length} Available)
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {concepts.map((concept) => {
                  const isSelected = selectedConceptIds.includes(concept.id);
                  return (
                    <button
                      key={concept.id}
                      type="button"
                      onClick={() => toggleConceptSelection(concept.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {concept.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Questions Builder */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Multiple-Choice Questions ({questions.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Select the radio button next to an option to designate it as the authoritative correct answer.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAiQuestions}
                  disabled={isAiGenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  title="Generate diagnostic questions using Agnes 3.0 Flash"
                >
                  {isAiGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>{isAiGenerating ? "Generating..." : "Agnes 3.0 Flash Assist"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id || qIndex}
                  className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4 relative group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {qIndex + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">Question {qIndex + 1}</span>
                      {q.isAiGenerated && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          AI Draft (Needs Review)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Concept selector for this specific question */}
                      {concepts.length > 0 && (
                        <select
                          value={q.conceptId || ""}
                          onChange={(e) => handleConceptChange(qIndex, e.target.value)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white"
                        >
                          <option value="">Map Concept (Optional)</option>
                          {concepts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIndex)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                    placeholder="Enter question text..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {/* 4 Options with Radio for Correct Option */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Answer Options (Select correct answer)
                    </span>
                    {q.options.map((optText: string, optIndex: number) => {
                      const isCorrect = q.correctOptionIndex === optIndex;
                      const letter = String.fromCharCode(65 + optIndex);

                      return (
                        <div
                          key={optIndex}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                            isCorrect
                              ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30"
                              : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="radio"
                              name={`correct_${q.id || qIndex}`}
                              checked={isCorrect}
                              onChange={() => handleCorrectOptionChange(qIndex, optIndex)}
                              className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                                isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {letter}
                            </span>
                          </label>

                          <input
                            type="text"
                            value={optText}
                            onChange={(e) =>
                              handleOptionChange(qIndex, optIndex, e.target.value)
                            }
                            placeholder={`Option ${letter}`}
                            className="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
                          />

                          {isCorrect && (
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/60 px-2 py-0.5 rounded-md shrink-0">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Field */}
                  <div className="pt-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Pedagogical Explanation
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ""}
                      onChange={(e) => handleExplanationChange(qIndex, e.target.value)}
                      placeholder="Why is this the correct answer? (Shown to student upon completion)"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={handlePreviewClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors w-full sm:w-auto justify-center"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span>Preview Assessment</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave("draft")}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave("published")}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publish Assessment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
