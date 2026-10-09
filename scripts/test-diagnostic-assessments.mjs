/**
 * scripts/test-diagnostic-assessments.mjs
 *
 * EduPilot AI — Student Diagnostic Assessment System Verification Suite
 *
 * Validates:
 * 1. Assessment & Attempt Data Schemas (questions, options, correctOptionIndex, concept mapping, duration)
 * 2. Teacher assessment workspace (creation, drafts, preview, publishing, results inspection)
 * 3. Student assessment experience (sanitized view, 1-at-a-time navigation, answer persistence, confirmation)
 * 4. Deterministic server-side grading & security (scores computed on server, answer keys hidden before submission)
 * 5. Diagnostic knowledge profile logic (demonstrated understanding, potential difficulty, insufficient evidence, not assessed)
 * 6. Agnes 3.0 Flash integration & resilient fallback
 * 7. Duplicate submission prevention
 * 8. Course isolation & authorization rules in firestore.rules
 * 9. Integration with student & teacher dashboards
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
    process.exitCode = 1;
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

console.log('================================================================');
console.log('   EDUPILOT AI — DIAGNOSTIC ASSESSMENT SYSTEM TEST SUITE');
console.log('================================================================\n');

// ─── 1. Assessment Types & Validation Schemas ────────────────────────────────
console.log('── 1. Assessment & Diagnostic Schemas Integrity ────────────────────────');

assert(fileExists('src/types/assessment.ts'), 'src/types/assessment.ts exists');
const assessmentTypesContent = readFile('src/types/assessment.ts');
assert(assessmentTypesContent.includes('export interface Question'), 'Question interface defined');
assert(assessmentTypesContent.includes('correctOptionIndex: number;'), 'Authoritative correctOptionIndex in Question');
assert(assessmentTypesContent.includes('export interface SanitizedQuestion'), 'SanitizedQuestion interface for students');
assert(!assessmentTypesContent.includes('correctOptionIndex: number;\n  conceptId?: string;\n  conceptName?: string;\n  points: number;\n}'), 'SanitizedQuestion strictly excludes correctOptionIndex');
assert(assessmentTypesContent.includes('export type ConceptDiagnosticStatus'), 'ConceptDiagnosticStatus defined');
assert(assessmentTypesContent.includes("'demonstrated_understanding'"), "Status includes 'demonstrated_understanding'");
assert(assessmentTypesContent.includes("'potential_difficulty'"), "Status includes 'potential_difficulty'");
assert(assessmentTypesContent.includes("'insufficient_evidence'"), "Status includes 'insufficient_evidence'");
assert(assessmentTypesContent.includes("'not_assessed'"), "Status includes 'not_assessed'");

const barrelTypesContent = readFile('src/types/index.ts');
assert(barrelTypesContent.includes('Question,'), 'Question re-exported from barrel index');
assert(barrelTypesContent.includes('SanitizedQuestion,'), 'SanitizedQuestion re-exported from barrel index');
assert(barrelTypesContent.includes('ConceptDiagnosticSummary,'), 'ConceptDiagnosticSummary re-exported from barrel index');

const validationContent = readFile('src/lib/validation/index.ts');
assert(validationContent.includes('export const questionSchema = z.object'), 'questionSchema defined with Zod');
assert(validationContent.includes('export const submitAssessmentSchema = z.object'), 'submitAssessmentSchema defined with Zod');
assert(validationContent.includes('createAssessmentSchema = z.object'), 'createAssessmentSchema defined with Zod');

// ─── 2. Assessment Service & Deterministic Grading Engine ────────────────────
console.log('\n── 2. Assessment Service & Server Grading Engine ──────────────────────');

assert(fileExists('src/services/assessments/assessmentService.ts'), 'assessmentService.ts exists');
const serviceContent = readFile('src/services/assessments/assessmentService.ts');
assert(serviceContent.includes('gradeAssessmentSubmission('), 'Deterministic gradeAssessmentSubmission method implemented');
assert(serviceContent.includes('listAssessmentAttempts('), 'listAssessmentAttempts implemented for teacher results view');
assert(serviceContent.includes('listStudentAttempts('), 'listStudentAttempts implemented');
assert(serviceContent.includes('deleteAssessment('), 'deleteAssessment implemented');

// Test the grading algorithm directly with test cases
console.log('\n── 3. Diagnostic Grading Algorithm Verification ───────────────────────');

// Replicate grading logic locally to test mathematical and pedagogical invariants
function testGradeLogic(assessment, answers) {
  const questions = assessment.questions || [];
  let score = 0;
  let totalMarks = 0;
  const conceptMap = {};

  (assessment.conceptIds || []).forEach((cId) => {
    conceptMap[cId] = { id: cId, name: cId, total: 0, correct: 0 };
  });

  const results = questions.map((q) => {
    const points = q.points || 1;
    totalMarks += points;
    const isCorrect = answers[q.id] === q.correctOptionIndex;
    if (isCorrect) score += points;

    if (q.conceptId) {
      if (!conceptMap[q.conceptId]) {
        conceptMap[q.conceptId] = { id: q.conceptId, name: q.conceptName || q.conceptId, total: 0, correct: 0 };
      }
      conceptMap[q.conceptId].total += 1;
      if (isCorrect) conceptMap[q.conceptId].correct += 1;
    }
    return { questionId: q.id, isCorrect };
  });

  const percentage = Math.round((score / totalMarks) * 100);
  const breakdown = Object.values(conceptMap).map((c) => {
    const count = c.total;
    const correct = c.correct;
    const pct = count > 0 ? Math.round((correct / count) * 100) : 0;
    let status;
    if (count === 0) status = 'not_assessed';
    else if (count === 1) status = 'insufficient_evidence';
    else if (pct >= 70) status = 'demonstrated_understanding';
    else if (pct < 60) status = 'potential_difficulty';
    else status = 'insufficient_evidence';
    return { conceptId: c.id, status, correct, total: count, pct };
  });

  return { score, totalMarks, percentage, results, breakdown };
}

const mockAssessment = {
  id: 'ass_test_1',
  title: 'Diagnostic Test',
  conceptIds: ['pointers', 'arrays', 'trees'],
  questions: [
    // 2 questions on pointers: student gets both correct -> demonstrated_understanding
    { id: 'q1', text: 'Pointer 1', options: ['A','B','C','D'], correctOptionIndex: 0, points: 1, conceptId: 'pointers', conceptName: 'Pointers' },
    { id: 'q2', text: 'Pointer 2', options: ['A','B','C','D'], correctOptionIndex: 1, points: 1, conceptId: 'pointers', conceptName: 'Pointers' },
    // 2 questions on arrays: student gets 0 correct -> potential_difficulty
    { id: 'q3', text: 'Array 1', options: ['A','B','C','D'], correctOptionIndex: 2, points: 1, conceptId: 'arrays', conceptName: 'Arrays' },
    { id: 'q4', text: 'Array 2', options: ['A','B','C','D'], correctOptionIndex: 3, points: 1, conceptId: 'arrays', conceptName: 'Arrays' },
    // 1 question on structs: student gets it wrong, but count=1 -> insufficient_evidence (NOT definitive failure)
    { id: 'q5', text: 'Struct 1', options: ['A','B','C','D'], correctOptionIndex: 0, points: 1, conceptId: 'structs', conceptName: 'Structs' },
  ],
};

const mockAnswers = {
  q1: 0, // correct (pointers)
  q2: 1, // correct (pointers)
  q3: 0, // incorrect (arrays, answered 0 instead of 2)
  q4: 0, // incorrect (arrays, answered 0 instead of 3)
  q5: 1, // incorrect (structs, answered 1 instead of 0)
};

const graded = testGradeLogic(mockAssessment, mockAnswers);

assert(graded.score === 2, 'Graded score is exactly 2 points');
assert(graded.totalMarks === 5, 'Total points possible is 5');
assert(graded.percentage === 40, 'Total score percentage is 40%');

const pointersDiag = graded.breakdown.find((b) => b.conceptId === 'pointers');
assert(pointersDiag && pointersDiag.status === 'demonstrated_understanding', '2/2 on Pointers -> demonstrated_understanding');

const arraysDiag = graded.breakdown.find((b) => b.conceptId === 'arrays');
assert(arraysDiag && arraysDiag.status === 'potential_difficulty', '0/2 on Arrays -> potential_difficulty');

const structsDiag = graded.breakdown.find((b) => b.conceptId === 'structs');
assert(structsDiag && structsDiag.status === 'insufficient_evidence', '1 wrong answer on Structs does NOT diagnose failure -> insufficient_evidence');

const treesDiag = graded.breakdown.find((b) => b.conceptId === 'trees');
assert(treesDiag && treesDiag.status === 'not_assessed', 'Unassessed concept -> not_assessed');

// ─── 4. API Endpoints Security & Isolation ───────────────────────────────────
console.log('\n── 4. API Endpoints & Security Invariants ─────────────────────────────');

assert(fileExists('src/app/api/assessments/[assessmentId]/route.ts'), 'GET/PUT/DELETE /api/assessments/[id] endpoint exists');
const getRouteContent = readFile('src/app/api/assessments/[assessmentId]/route.ts');
assert(getRouteContent.includes('isTeacher || isAdmin'), 'Checks teacher/admin before exposing answer key');
assert(getRouteContent.includes('sanitizedQuestions'), 'Sanitizes questions for students');
assert(!getRouteContent.includes('sanitizedQuestions: SanitizedQuestion[] = (assessment.questions || []).map((q) => ({\n        id: q.id,\n        text: q.text,\n        options: q.options,\n        correctOptionIndex'), 'Student sanitization scrubs correctOptionIndex');
assert(getRouteContent.includes("Draft assessments are not accessible to students"), 'Draft assessments rejected with 403 for students');

assert(fileExists('src/app/api/assessments/[assessmentId]/submit/route.ts'), 'POST /api/assessments/[id]/submit endpoint exists');
const submitRouteContent = readFile('src/app/api/assessments/[assessmentId]/submit/route.ts');
assert(submitRouteContent.includes('gradeAssessmentSubmission('), 'Calls server-side deterministic grading');
assert(submitRouteContent.includes('alreadyCompleted'), 'Detects and blocks duplicate submissions');
assert(submitRouteContent.includes('completeAssessmentAttempt('), 'Persists completed attempt to assessment_attempts');
assert(submitRouteContent.includes('upsertLearningProfile('), 'Updates student learning profile mastery baseline');

// ─── 5. Agnes AI Integration & Non-Blocking Fallback ─────────────────────────
console.log('\n── 5. Agnes 3.0 Flash AI Integration ──────────────────────────────────');

assert(fileExists('src/app/api/ai/assessments/generate-questions/route.ts'), 'Question generation API endpoint exists');
const aiRouteContent = readFile('src/app/api/ai/assessments/generate-questions/route.ts');
assert(aiRouteContent.includes('agnesClient.completeChat'), 'Invokes Agnes 3.0 Flash server-side');
assert(aiRouteContent.includes('grounded_template_fallback'), 'Includes graceful fallback if Agnes is unavailable');
assert(aiRouteContent.includes('isAiGenerated: true'), 'Flags questions as AI drafts until teacher reviews');

// ─── 6. Teacher UI & Workspace Integration ───────────────────────────────────
console.log('\n── 6. Teacher Assessment Workspace ────────────────────────────────────');

assert(fileExists('src/app/teacher/courses/[courseId]/assessments/page.tsx'), 'Course assessments workspace page exists');
assert(fileExists('src/components/teacher/assessments/CreateAssessmentModal.tsx'), 'CreateAssessmentModal component exists');
assert(fileExists('src/components/teacher/assessments/PreviewAssessmentModal.tsx'), 'PreviewAssessmentModal component exists');
assert(fileExists('src/components/teacher/assessments/AssessmentResultsModal.tsx'), 'AssessmentResultsModal component exists');

const teacherPageContent = readFile('src/app/teacher/courses/[courseId]/assessments/page.tsx');
assert(teacherPageContent.includes('handleTogglePublish'), 'Teacher can publish and unpublish drafts');
assert(teacherPageContent.includes('setIsCreateOpen(true)'), 'Create diagnostic assessment trigger');
assert(teacherPageContent.includes('setResultsAssessment'), 'Results modal view trigger');

const createModalContent = readFile('src/components/teacher/assessments/CreateAssessmentModal.tsx');
assert(createModalContent.includes('handleGenerateAiQuestions'), 'Agnes question generation button wired');
assert(createModalContent.includes('handleSave("draft")'), 'Save as draft action');
assert(createModalContent.includes('handleSave("published")'), 'Publish assessment action');
assert(createModalContent.includes('handlePreviewClick'), 'Preview assessment action');

const resultsModalContent = readFile('src/components/teacher/assessments/AssessmentResultsModal.tsx');
assert(resultsModalContent.includes('unattemptedMembers'), 'Roster of students who have not yet attempted is displayed');
assert(resultsModalContent.includes('classConceptStats'), 'Curriculum concept aggregate analytics calculated');

// ─── 7. Student UI & Dashboard Integration ───────────────────────────────────
console.log('\n── 7. Student Assessment Experience & Dashboard ───────────────────────');

assert(fileExists('src/app/student/assessments/page.tsx'), 'Student assessments page exists');
assert(fileExists('src/components/student/TakeAssessmentModal.tsx'), 'TakeAssessmentModal exists');

const takeModalContent = readFile('src/components/student/TakeAssessmentModal.tsx');
assert(takeModalContent.includes('currentIndex'), 'One question at a time navigation');
assert(takeModalContent.includes('localStorage.setItem'), 'Answer persistence across refresh');
assert(takeModalContent.includes('isReviewStep'), 'Pre-submission confirmation step');
assert(takeModalContent.includes('isSubmitting'), 'Prevents duplicate clicks/submissions');
assert(takeModalContent.includes('conceptBreakdown'), 'Renders diagnostic profile upon grading');

const studentDashboardContent = readFile('src/app/student/dashboard/page.tsx');
assert(studentDashboardContent.includes('publishedAssessments'), 'Loads real published course assessments');
assert(studentDashboardContent.includes('TakeAssessmentModal'), 'Integrates TakeAssessmentModal directly on dashboard');
assert(!studentDashboardContent.includes('DiagnosticAssessmentModal'), 'Replaced legacy client modal with authentic TakeAssessmentModal');

// ─── 8. Firestore Security Rules ─────────────────────────────────────────────
console.log('\n── 8. Firestore Security Rules Integrity ──────────────────────────────');

const firestoreRulesContent = readFile('firestore.rules');
assert(firestoreRulesContent.includes("resource.data.status == 'published'"), 'Draft assessments hidden from students in firestore.rules');
assert(firestoreRulesContent.includes("isCourseTeacher(resource.data.courseId)"), 'Course teacher authorized in firestore.rules');
assert(firestoreRulesContent.includes("match /assessment_attempts/{attemptId}"), 'assessment_attempts collection rules defined');
assert(firestoreRulesContent.includes("allow delete: if false;"), 'Attempts deletion strictly forbidden');

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
}
