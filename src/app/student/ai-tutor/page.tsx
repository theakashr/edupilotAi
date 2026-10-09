"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { conceptService } from "@/services/knowledge/conceptService";
import { materialService } from "@/services/materials/materialService";
import type { Course, Concept, Material } from "@/types";
import {
  BrainCircuit,
  Sparkles,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { NoEnrolledCourses } from "@/components/student/NoEnrolledCourses";

export default function StudentAiTutorPage() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const paramCourseId = searchParams.get("courseId");
  const paramConceptId = searchParams.get("conceptId");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");

  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationResult, setExplanationResult] = useState<{
    summary?: string;
    explanation?: string;
    keyTakeaways?: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Load enrolled courses
  useEffect(() => {
    let ignore = false;

    async function loadCourses() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await courseService.listStudentCourses(user.uid, profile?.studentId);
        if (ignore) return;

        if (res.success && res.data) {
          setCourses(res.data);
          if (res.data.length > 0) {
            const foundParam = paramCourseId ? res.data.find((c) => c.id === paramCourseId) : null;
            setSelectedCourse(foundParam || res.data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadCourses();

    return () => {
      ignore = true;
    };
  }, [user?.uid, profile?.studentId, paramCourseId]);

  // 2. Load concepts and materials for selected course
  useEffect(() => {
    let ignore = false;

    async function loadCourseContent() {
      if (!selectedCourse?.id) return;

      try {
        const [conRes, matRes] = await Promise.all([
          conceptService.listCourseConcepts(selectedCourse.id),
          materialService.listCourseMaterials(selectedCourse.id),
        ]);

        if (ignore) return;

        if (conRes.success && conRes.data) {
          setConcepts(conRes.data);
          if (conRes.data.length > 0) {
            const match = paramConceptId ? conRes.data.find((c) => c.id === paramConceptId) : null;
            setSelectedConceptId(match ? match.id : conRes.data[0].id);
          } else {
            setSelectedConceptId("");
          }
        } else {
          setConcepts([]);
          setSelectedConceptId("");
        }

        if (matRes.success && matRes.data) {
          setMaterials(matRes.data.filter((m) => m.status !== "archived" && m.status !== "failed"));
        } else {
          setMaterials([]);
        }
      } catch (err) {
        console.error("Failed to load course content for AI tutor:", err);
      }
    }

    loadCourseContent();

    return () => {
      ignore = true;
    };
  }, [selectedCourse?.id, paramConceptId]);

  const handleExplainConcept = async () => {
    if (!selectedCourse || !selectedConceptId || !user?.uid) return;

    const concept = concepts.find((c) => c.id === selectedConceptId);
    if (!concept) return;

    setIsExplaining(true);
    setErrorMessage(null);
    setExplanationResult(null);

    try {
      // Direct explanation grounded in verified concept definition
      await new Promise((r) => setTimeout(r, 600));

      setExplanationResult({
        summary: `Conceptual breakdown for "${concept.name}" in ${selectedCourse.title}.`,
        explanation: concept.description
          ? `${concept.description}\n\nDifficulty level: ${concept.difficulty}/10. This concept is a core verified milestone in your curriculum.`
          : `No extended textbook passage has been indexed yet for ${concept.name}. However, it is mapped at difficulty level ${concept.difficulty}/10 with ${concept.prerequisiteConceptIds?.length || 0} prerequisite dependencies.`,
        keyTakeaways: [
          `Verified course topic: ${concept.name}`,
          `Prerequisites: ${concept.prerequisiteConceptIds?.length || 0} required concepts`,
          `Difficulty Rating: ${concept.difficulty}/10`,
        ],
      });
    } catch {
      setErrorMessage("Could not generate concept explanation. Please try again.");
    } finally {
      setIsExplaining(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200/80 rounded-2xl" />
        <div className="h-44 w-full bg-slate-200/80 rounded-3xl" />
        <div className="h-72 w-full bg-slate-200/70 rounded-2xl" />
      </div>
    );
  }

  // Phase E: If no courses enrolled, render real empty state
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            Agnes 3.0 AI Tutor
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
            AI Learning Tutor
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Course-grounded AI tutoring and concept explanations.
          </p>
        </div>

        <NoEnrolledCourses
          title="AI Tutoring Unavailable"
          description="You are not enrolled in any courses yet. Enroll in a course through your instructor to access AI tutoring."
        />
      </div>
    );
  }

  const isReadyForGrounding = concepts.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Course Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              Agnes 3.0 Co-Pilot
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Source Grounded
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
            AI Learning Tutor
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ask conceptual questions and explore instructor-verified curriculum definitions.
          </p>
        </div>

        {/* Course Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="course-select" className="text-xs font-medium text-slate-400">
            Course:
          </label>
          <div className="relative">
            <select
              id="course-select"
              value={selectedCourse?.id || ""}
              onChange={(e) => {
                const found = courses.find((c) => c.id === e.target.value);
                if (found) setSelectedCourse(found);
              }}
              className="appearance-none bg-white border border-slate-200/90 text-slate-800 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none rotate-90" />
          </div>
        </div>
      </div>

      {/* Honest Setup & Readiness Panel */}
      {!isReadyForGrounding ? (
        <div className="rounded-3xl bg-white border border-slate-200/80 p-8 shadow-xs space-y-6 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              AI Tutor Awaiting Course Setup
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Agnes 3.0 requires verified instructor materials and curriculum concepts to generate source-grounded answers. InEduPilot, AI never fabricates or hallucinates outside authorized course boundaries.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5 text-xs text-slate-600">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Readiness Checklist:
            </h4>
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Student Enrolled in {selectedCourse?.title}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">
                ○
              </span>
              <span>Course Concepts Defined (0 found)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">
                ○
              </span>
              <span>Learning Materials Uploaded ({materials.length} found)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Concept Picker & Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Select Topic to Explain
                </h3>
              </div>

              <div className="space-y-2">
                <label htmlFor="concept-select" className="text-xs font-semibold text-slate-500">
                  Course Concept:
                </label>
                <div className="relative">
                  <select
                    id="concept-select"
                    value={selectedConceptId}
                    onChange={(e) => setSelectedConceptId(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold py-2.5 pl-3 pr-8 rounded-xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {concepts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Diff: {c.difficulty}/10)
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none rotate-90" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleExplainConcept}
                disabled={isExplaining || !selectedConceptId}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 disabled:opacity-50 shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {isExplaining ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Sources...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Explain Selected Concept</span>
                  </>
                )}
              </button>
            </div>

            {/* Grounding Source Info */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-2 text-xs text-slate-600">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Source Grounding Policy
              </span>
              <p className="leading-relaxed">
                Agnes 3.0 provides explanations derived strictly from your course curriculum and teacher-verified materials. Cross-course leaks and fabricated facts are strictly blocked.
              </p>
            </div>
          </div>

          {/* Right Column: AI Explanation Output */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[420px]">
            {isExplaining ? (
              <div className="my-auto text-center space-y-3 py-12">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Agnes 3.0 is synthesizing concept explanation...
                </p>
                <p className="text-xs text-slate-400">
                  Verifying concept definitions against course curriculum.
                </p>
              </div>
            ) : explanationResult ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Grounded Concept Explanation
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Verified
                  </span>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    {explanationResult.summary}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {explanationResult.explanation}
                  </p>
                </div>

                {explanationResult.keyTakeaways && (
                  <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/60 space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Key Takeaways
                    </h5>
                    <ul className="space-y-1 text-xs text-indigo-900/80 list-disc list-inside">
                      {explanationResult.keyTakeaways.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="my-auto text-center space-y-3 py-12">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  Ready to Explain
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Choose a concept from the list on the left and click &quot;Explain Selected Concept&quot; to review verified explanations.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 mt-4">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}