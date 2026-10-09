/**
 * src/app/api/learning/teacher-insights/route.ts
 *
 * GET /api/learning/teacher-insights?courseId=...
 *
 * Provides teacher-scoped class-level adaptive learning analytics:
 * - Aggregated student mastery profiles.
 * - Identified learning gaps and prerequisite bottlenecks.
 * - Students with insufficient evidence (needs diagnostic assessment).
 * - System/AI intervention recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { courseService } from '@/services/courses/courseService';
import { conceptService } from '@/services/knowledge/conceptService';
import { assessmentService } from '@/services/assessments/assessmentService';
import { aiService } from '@/services/ai/aiService';
import { getUserProfile } from '@/lib/firebase/firestore';
import { estimateStudentCourseMastery } from '@/services/learning/masteryEstimator';
import { diagnoseLearningGaps } from '@/services/learning/learningGapEngine';
import type { StudentGapSummary, AssessmentAttempt, Concept, CourseMember } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('courseId');

    const authUserId = req.headers.get('x-user-id');
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'courseId query parameter is required' }, { status: 400 });
    }

    // 1. Authorize Teacher
    const callerProfile = await getUserProfile(authUserId);
    if (!callerProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const courseRes = await courseService.getCourseById(courseId);
    if (!courseRes.success || !courseRes.data) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (courseRes.data.teacherId !== authUserId) {
      return NextResponse.json({ error: 'Forbidden: You are not authorized to view insights for this course' }, { status: 403 });
    }

    // 2. Fetch Course Data
    const [membersRes, conceptsRes, attemptsRes, recommendationsRes] = await Promise.all([
      courseService.listCourseMembers(courseId),
      conceptService.listCourseConcepts(courseId),
      assessmentService.listCourseAttempts(courseId),
      aiService.listCourseRecommendations(courseId),
    ]);

    const members: CourseMember[] = membersRes.success && membersRes.data ? membersRes.data : [];
    const concepts: Concept[] = conceptsRes.success && conceptsRes.data ? conceptsRes.data : [];
    const attempts: AssessmentAttempt[] = attemptsRes.success && attemptsRes.data ? attemptsRes.data : [];
    const recommendations = recommendationsRes.success && recommendationsRes.data ? recommendationsRes.data : [];

    const completedAttempts = attempts.filter((a) => a.status === 'completed');

    // Group completed attempts by studentId
    const attemptsByStudent = new Map<string, AssessmentAttempt[]>();
    for (const att of completedAttempts) {
      const list = attemptsByStudent.get(att.studentId) || [];
      list.push(att);
      attemptsByStudent.set(att.studentId, list);
    }

    // Fetch user profiles for members in parallel
    const memberProfiles = await Promise.all(
      members.map(async (m) => {
        const prof = await getUserProfile(m.studentId);
        return {
          studentId: m.studentId,
          name: prof?.displayName || prof?.email?.split('@')[0] || `Student (${m.studentId.slice(0, 6)})`,
          email: prof?.email || '',
        };
      })
    );
    const profileMap = new Map(memberProfiles.map((p) => [p.studentId, p]));

    // 3. Analyze each enrolled student
    const studentSummaries: StudentGapSummary[] = [];
    const conceptFailureTally: Record<string, { conceptName: string; failureCount: number; evaluatedCount: number }> = {};

    for (const c of concepts) {
      conceptFailureTally[c.id] = { conceptName: c.name, failureCount: 0, evaluatedCount: 0 };
    }

    for (const member of members) {
      const studentId = member.studentId;
      const studentAttempts = attemptsByStudent.get(studentId) || [];

      // Calculate mastery
      const profile = estimateStudentCourseMastery(studentId, courseId, concepts, studentAttempts);
      const gapDiag = diagnoseLearningGaps(concepts, profile, []);

      // Check if student needs baseline assessment
      const needsDiagnostic = studentAttempts.length === 0;

      // Extract struggling concepts
      const strugglingConcepts: StudentGapSummary['strugglingConcepts'] = [];
      for (const gap of gapDiag.activeGaps) {
        strugglingConcepts.push({
          conceptId: gap.conceptId,
          conceptName: gap.conceptName,
          score: gap.currentMastery,
          riskLevel: gap.riskLevel,
          evidence: gap.evidence,
        });

        if (conceptFailureTally[gap.conceptId]) {
          conceptFailureTally[gap.conceptId].failureCount++;
        }
      }

      // Tally evaluated concepts for failure rates
      for (const c of concepts) {
        const est = profile.masteries[c.id];
        if (est && est.status !== 'not_assessed') {
          if (conceptFailureTally[c.id]) {
            conceptFailureTally[c.id].evaluatedCount++;
          }
        }
      }

      // Confidence level for student overall
      let overallConfidence: StudentGapSummary['confidence'] = 'insufficient';
      if (profile.evaluatedConcepts >= Math.min(3, concepts.length)) {
        overallConfidence = 'moderate';
      } else if (profile.evaluatedConcepts > 0) {
        overallConfidence = 'low';
      }

      const studentInfo = profileMap.get(studentId);

      studentSummaries.push({
        studentId,
        studentName: studentInfo?.name || `Student (${studentId.slice(0, 6)})`,
        studentEmail: studentInfo?.email || '',
        overallMastery: profile.overallMastery,
        confidence: overallConfidence,
        activeGapCount: gapDiag.activeGaps.length,
        resolvedGapCount: gapDiag.resolvedGapCount,
        strugglingConcepts,
        needsDiagnostic,
        lastAttemptAt: studentAttempts.length > 0 ? studentAttempts[0].submittedAt : undefined,
      });
    }

    // 4. Calculate concept difficulty rankings
    const conceptDifficulties = Object.entries(conceptFailureTally)
      .map(([conceptId, data]) => ({
        conceptId,
        conceptName: data.conceptName,
        failureRate: data.evaluatedCount > 0 ? Math.round((data.failureCount / data.evaluatedCount) * 100) : 0,
        strugglingStudentCount: data.failureCount,
        evaluatedStudentCount: data.evaluatedCount,
      }))
      .sort((a, b) => b.failureRate - a.failureRate);

    return NextResponse.json({
      success: true,
      data: {
        totalEnrolled: members.length,
        studentsWithAttempts: attemptsByStudent.size,
        studentsNeedingDiagnostic: members.filter((m) => !attemptsByStudent.has(m.studentId)).length,
        studentSummaries,
        conceptDifficulties,
        recommendations,
      },
    });
  } catch (err: unknown) {
    console.error('Error in GET /api/learning/teacher-insights:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
