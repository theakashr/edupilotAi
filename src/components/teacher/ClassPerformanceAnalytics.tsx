"use client";

import { useEffect, useState } from "react";
import { assessmentService } from "@/services/assessments/assessmentService";
import { Loader2, TrendingDown, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import type { AssessmentAttempt } from "@/types";

interface TopicStat {
  conceptId: string;
  conceptName: string;
  totalQuestions: number;
  totalCorrect: number;
  strugglingStudents: Set<string>;
}

interface AIRecommendation {
  topic: string;
  issue: string;
  suggestion: string;
  practiceActivities: string[];
}

export function ClassPerformanceAnalytics({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicStats, setTopicStats] = useState<{
    conceptId: string;
    conceptName: string;
    avgScore: number;
    strugglingCount: number;
  }[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await assessmentService.listCourseAttempts(courseId);
        if (!res.success) {
          setError(res.error || "Failed to load attempts");
          return;
        }
        if (!res.data) {
          setError("No data found");
          return;
        }

        const attempts = res.data.filter(a => a.status === 'completed');
        const statsMap = new Map<string, TopicStat>();

        for (const attempt of attempts) {
          if (attempt.conceptBreakdown) {
            for (const cb of attempt.conceptBreakdown) {
              if (!statsMap.has(cb.conceptId)) {
                statsMap.set(cb.conceptId, {
                  conceptId: cb.conceptId,
                  conceptName: cb.conceptName,
                  totalQuestions: 0,
                  totalCorrect: 0,
                  strugglingStudents: new Set(),
                });
              }
              const stat = statsMap.get(cb.conceptId)!;
              stat.totalQuestions += cb.questionsCount;
              stat.totalCorrect += cb.correctCount;
              
              if (cb.scorePercentage < 60 || cb.status === 'potential_difficulty') {
                stat.strugglingStudents.add(attempt.studentId);
              }
            }
          }
        }

        const finalStats = Array.from(statsMap.values()).map(stat => ({
          conceptId: stat.conceptId,
          conceptName: stat.conceptName,
          avgScore: stat.totalQuestions > 0 ? Math.round((stat.totalCorrect / stat.totalQuestions) * 100) : 0,
          strugglingCount: stat.strugglingStudents.size,
        })).filter(s => s.conceptName); // Basic filter

        setTopicStats(finalStats.sort((a, b) => a.avgScore - b.avgScore)); // Sort by weakest
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [courseId]);

  const generateRecommendations = async () => {
    if (topicStats.length === 0) return;
    try {
      setGeneratingAi(true);
      setAiError(null);
      const res = await fetch('/api/ai/class-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, topicStats }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate recommendations');
      }
      setRecommendations(data.data.recommendations || []);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setGeneratingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 flex justify-center shadow-xs">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-6 text-red-600 shadow-xs">
        <AlertCircle className="w-5 h-5 inline mr-2" /> {error}
      </div>
    );
  }

  if (topicStats.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 shadow-xs">
        No assessment data available for class analytics yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-indigo-600" />
          Class Performance Analytics
        </h2>
        <button
          onClick={generateRecommendations}
          disabled={generatingAi}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
        >
          {generatingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {recommendations.length > 0 ? "Refresh AI Insights" : "Generate AI Insights"}
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bar Chart Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Topic Performance</h3>
            {topicStats.map((stat) => (
              <div key={stat.conceptId} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-800 truncate pr-4">{stat.conceptName}</span>
                  <span className="text-gray-500 font-medium shrink-0">{stat.avgScore}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${stat.avgScore < 60 ? 'bg-red-500' : stat.avgScore < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${stat.avgScore}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500 text-right">
                  {stat.strugglingCount} student{stat.strugglingCount !== 1 ? 's' : ''} struggling
                </div>
              </div>
            ))}
          </div>

          {/* AI Recommendations Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              AI Recommendations
            </h3>
            
            {aiError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
                {aiError}
              </div>
            )}

            {recommendations.length === 0 && !generatingAi && !aiError && (
              <div className="text-sm text-gray-500 italic bg-gray-50 p-6 rounded-xl text-center border border-dashed border-gray-200">
                Click "Generate AI Insights" to analyze class weaknesses and get targeted teaching strategies.
              </div>
            )}

            {generatingAi && recommendations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm animate-pulse">Analyzing class performance...</p>
              </div>
            )}

            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                  <h4 className="font-semibold text-indigo-900 text-sm mb-1">{rec.topic}</h4>
                  <p className="text-xs text-rose-600 font-medium mb-2">Issue: {rec.issue}</p>
                  <p className="text-sm text-gray-700 mb-3">{rec.suggestion}</p>
                  
                  {rec.practiceActivities && rec.practiceActivities.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested Activities</span>
                      <ul className="mt-1.5 space-y-1">
                        {rec.practiceActivities.map((act, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <span className="text-indigo-400 mt-0.5">•</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
