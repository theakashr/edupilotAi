/**
 * scripts/test-phase8-conflict.mjs
 *
 * Phase 8: Source Trust & Conflict Resolution — Automated Assertion Suite
 *
 * Run:
 *   node scripts/test-phase8-conflict.mjs
 *
 * Tests:
 * 1. Type definitions
 * 2. Collection constants
 * 3. Validation schemas (Zod)
 * 4. Agnes types (Zod schemas for conflict response)
 * 5. Agnes prompts
 * 6. Conflict service structure
 * 7. Agnes service (analyzeSourceConflict interface)
 * 8. API route existence
 * 9. Phase 5–7 regression (key files must still exist)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function fileContains(relPath, ...needles) {
  if (!fileExists(relPath)) return false;
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
  return needles.every((n) => content.includes(n));
}

// ─── 1. Type Definitions ──────────────────────────────────────────────────────
console.log('\n── 1. Type Definitions ──────────────────────────────────────────────────');

assert(fileExists('src/types/conflict.ts'), 'conflict.ts exists');
assert(fileContains('src/types/conflict.ts', "TrustTier"), "TrustTier type defined");
assert(fileContains('src/types/conflict.ts', "'primary' | 'secondary' | 'reference'"), "TrustTier values correct");
assert(fileContains('src/types/conflict.ts', "ConflictSeverity"), "ConflictSeverity type defined");
assert(fileContains('src/types/conflict.ts', "'low' | 'medium' | 'high'"), "ConflictSeverity values correct");
assert(fileContains('src/types/conflict.ts', "ConflictStatus"), "ConflictStatus type defined");
assert(fileContains('src/types/conflict.ts', "'pending' | 'accepted' | 'dismissed' | 'needs_revision'"), "ConflictStatus values correct");
assert(fileContains('src/types/conflict.ts', "SourceProfile"), "SourceProfile interface defined");
assert(fileContains('src/types/conflict.ts', "SourceConflict"), "SourceConflict interface defined");
assert(fileContains('src/types/conflict.ts', "claimA", "claimB"), "SourceConflict has claimA/claimB provenance fields");
assert(fileContains('src/types/conflict.ts', "resolvedBy", "resolvedAt"), "SourceConflict has resolution audit fields");
assert(fileContains('src/types/conflict.ts', "AI DOES NOT DECIDE"), "Human-in-the-loop constraint documented");

// ─── 2. Types Barrel ─────────────────────────────────────────────────────────
console.log('\n── 2. Types Barrel ──────────────────────────────────────────────────────');

assert(fileContains('src/types/index.ts', "TrustTier"), "TrustTier exported from barrel");
assert(fileContains('src/types/index.ts', "SourceProfile"), "SourceProfile exported from barrel");
assert(fileContains('src/types/index.ts', "SourceConflict"), "SourceConflict exported from barrel");
assert(fileContains('src/types/index.ts', "ConflictStatus"), "ConflictStatus exported from barrel");
assert(fileContains('src/types/index.ts', "ConflictSeverity"), "ConflictSeverity exported from barrel");

// ─── 3. Collection Constants ──────────────────────────────────────────────────
console.log('\n── 3. Collection Constants ──────────────────────────────────────────────');

assert(fileContains('src/lib/firebase/collections.ts', "SOURCE_PROFILES: 'source_profiles'"), "SOURCE_PROFILES constant registered");
assert(fileContains('src/lib/firebase/collections.ts', "SOURCE_CONFLICTS: 'source_conflicts'"), "SOURCE_CONFLICTS constant registered");

// ─── 4. Firestore Converters ──────────────────────────────────────────────────
console.log('\n── 4. Firestore Converters ──────────────────────────────────────────────');

assert(fileContains('src/lib/firebase/converters.ts', "sourceProfileCollection"), "sourceProfileCollection exported");
assert(fileContains('src/lib/firebase/converters.ts', "sourceConflictCollection"), "sourceConflictCollection exported");
assert(fileContains('src/lib/firebase/converters.ts', "SourceProfile", "SourceConflict"), "Phase 8 types imported in converters");

// ─── 5. Validation Schemas ────────────────────────────────────────────────────
console.log('\n── 5. Validation Schemas ────────────────────────────────────────────────');

assert(fileContains('src/lib/validation/index.ts', "trustTierSchema"), "trustTierSchema defined");
assert(fileContains('src/lib/validation/index.ts', "conflictStatusSchema"), "conflictStatusSchema defined");
assert(fileContains('src/lib/validation/index.ts', "createSourceProfileSchema"), "createSourceProfileSchema defined");
assert(fileContains('src/lib/validation/index.ts', "updateSourceProfileSchema"), "updateSourceProfileSchema defined");
assert(fileContains('src/lib/validation/index.ts', "analyzeConflictSchema"), "analyzeConflictSchema defined");
assert(fileContains('src/lib/validation/index.ts', "resolveConflictSchema"), "resolveConflictSchema defined");
assert(fileContains('src/lib/validation/index.ts', "trustedMaterialId"), "resolveConflictSchema includes trustedMaterialId");
assert(fileContains('src/lib/validation/index.ts', "CreateSourceProfileInput"), "CreateSourceProfileInput type exported");
assert(fileContains('src/lib/validation/index.ts', "AnalyzeConflictInput"), "AnalyzeConflictInput type exported");
assert(fileContains('src/lib/validation/index.ts', "ResolveConflictInput"), "ResolveConflictInput type exported");

// ─── 6. Agnes Types (Zod Schemas) ─────────────────────────────────────────────
console.log('\n── 6. Agnes Types (Zod Schemas) ─────────────────────────────────────────');

assert(fileContains('src/services/ai/agnes/agnesTypes.ts', "conflictSeveritySchema"), "conflictSeveritySchema defined");
assert(fileContains('src/services/ai/agnes/agnesTypes.ts', "detectedConflictSchema"), "detectedConflictSchema defined");
assert(fileContains('src/services/ai/agnes/agnesTypes.ts', "conflictAnalysisResponseSchema"), "conflictAnalysisResponseSchema defined");
assert(fileContains('src/services/ai/agnes/agnesTypes.ts', "noConflictsFound"), "noConflictsFound field in schema");
assert(fileContains('src/services/ai/agnes/agnesTypes.ts', "insufficientContext"), "insufficientContext field in schema");
assert(fileContains('src/services/ai/agnes/agnesTypes.ts', "ConflictAnalysisResponse"), "ConflictAnalysisResponse type exported");
assert(fileContains('src/services/ai/agnes/agnesTypes.ts', "DetectedConflict"), "DetectedConflict type exported");

// ─── 7. Agnes Prompts ─────────────────────────────────────────────────────────
console.log('\n── 7. Agnes Prompts ─────────────────────────────────────────────────────');

assert(fileContains('src/services/ai/agnes/agnesPrompts.ts', "buildConflictAnalysisSystemPrompt"), "buildConflictAnalysisSystemPrompt exported");
assert(fileContains('src/services/ai/agnes/agnesPrompts.ts', "NEUTRALITY IS MANDATORY"), "Neutrality constraint in prompt");
assert(fileContains('src/services/ai/agnes/agnesPrompts.ts', "exclusively to the human teacher"), "Human-in-the-loop constraint in prompt");
assert(fileContains('src/services/ai/agnes/agnesPrompts.ts', "UNTRUSTED DATA"), "Prompt injection defense in conflict prompt");
assert(fileContains('src/services/ai/agnes/agnesPrompts.ts', "noConflictsFound"), "noConflictsFound in prompt schema example");

// ─── 8. Conflict Service ──────────────────────────────────────────────────────
console.log('\n── 8. Conflict Service ──────────────────────────────────────────────────');

assert(fileExists('src/services/conflict/conflictService.ts'), "conflictService.ts exists");
assert(fileContains('src/services/conflict/conflictService.ts', "upsertSourceProfile"), "upsertSourceProfile method exists");
assert(fileContains('src/services/conflict/conflictService.ts', "getSourceProfile"), "getSourceProfile method exists");
assert(fileContains('src/services/conflict/conflictService.ts', "listCourseSourceProfiles"), "listCourseSourceProfiles method exists");
assert(fileContains('src/services/conflict/conflictService.ts', "updateSourceProfile"), "updateSourceProfile method exists");
assert(fileContains('src/services/conflict/conflictService.ts', "deleteSourceProfile"), "deleteSourceProfile method exists");
assert(fileContains('src/services/conflict/conflictService.ts', "createConflict"), "createConflict method exists");
assert(fileContains('src/services/conflict/conflictService.ts', "getConflictById"), "getConflictById method exists");
assert(fileContains('src/services/conflict/conflictService.ts', "listCourseConflicts"), "listCourseConflicts method exists");
assert(fileContains('src/services/conflict/conflictService.ts', "resolveConflict"), "resolveConflict method exists");
assert(fileContains('src/services/conflict/conflictService.ts', "countPendingConflicts"), "countPendingConflicts method exists");
assert(fileContains('src/services/conflict/conflictService.ts', "status: 'pending'"), "New conflicts always start as pending");
assert(fileContains('src/services/conflict/conflictService.ts', "courseId}__${materialId}"), "Composite ID enforces one-profile-per-material");
assert(fileContains('src/services/conflict/conflictService.ts', "AI DOES NOT DECIDE"), "Human-in-the-loop constraint documented");
assert(fileContains('src/services/conflict/conflictService.ts', "HUMAN-IN-THE-LOOP"), "HITL enforcement documented in resolveConflict");

// ─── 9. Agnes Service ─────────────────────────────────────────────────────────
console.log('\n── 9. Agnes Service ─────────────────────────────────────────────────────');

assert(fileContains('src/services/ai/agnesService.ts', "analyzeSourceConflict"), "analyzeSourceConflict method exported");
assert(fileContains('src/services/ai/agnesService.ts', "AnalyzeSourceConflictParams"), "AnalyzeSourceConflictParams interface defined");
assert(fileContains('src/services/ai/agnesService.ts', "ConflictAnalysisResponse"), "ConflictAnalysisResponse imported");
assert(fileContains('src/services/ai/agnesService.ts', "buildConflictAnalysisSystemPrompt"), "Conflict system prompt used");
assert(fileContains('src/services/ai/agnesService.ts', "chunkA.courseId !== params.courseId"), "Cross-course protection for chunkA");
assert(fileContains('src/services/ai/agnesService.ts', "chunkB.courseId !== params.courseId"), "Cross-course protection for chunkB");
assert(fileContains('src/services/ai/agnesService.ts', "conflictService.createConflict"), "Detected conflicts persisted to Firestore");
assert(fileContains('src/services/conflict/conflictService.ts', "status: 'pending'"), "Conflicts are always created with status pending in conflictService");
assert(fileContains('src/services/ai/agnesService.ts', "eventType: 'source_conflict'"), "Conflict audit event logged");
assert(fileContains('src/app/api/courses/[courseId]/conflicts/[conflictId]/route.ts', "teacher_override"), "Teacher resolution audit-logged as teacher_override in conflict resolution route");

// ─── 10. API Routes ───────────────────────────────────────────────────────────
console.log('\n── 10. API Routes ───────────────────────────────────────────────────────');

assert(fileExists('src/app/api/ai/conflict/route.ts'), "POST /api/ai/conflict route exists");
assert(fileContains('src/app/api/ai/conflict/route.ts', "analyzeConflictSchema"), "Conflict route validates input with Zod");
assert(fileContains('src/app/api/ai/conflict/route.ts', "role !== 'teacher'"), "Conflict route is teacher-only");
assert(fileContains('src/app/api/ai/conflict/route.ts', "courseRes.data.teacherId !== userId"), "Conflict route enforces course ownership");
assert(fileContains('src/app/api/ai/conflict/route.ts', "materialIdA === materialIdB"), "Same-material check in conflict route");

assert(fileExists('src/app/api/courses/[courseId]/conflicts/route.ts'), "GET /courses/[courseId]/conflicts route exists");
assert(fileExists('src/app/api/courses/[courseId]/conflicts/[conflictId]/route.ts'), "PATCH /courses/[courseId]/conflicts/[conflictId] route exists");
assert(fileContains('src/app/api/courses/[courseId]/conflicts/[conflictId]/route.ts', "status !== 'pending'"), "Re-resolution guard in PATCH route");
assert(fileContains('src/app/api/courses/[courseId]/conflicts/[conflictId]/route.ts', "teacher_override"), "Teacher resolution audit-logged as teacher_override");

assert(fileExists('src/app/api/courses/[courseId]/source-profiles/route.ts'), "GET/POST /source-profiles route exists");
assert(fileContains('src/app/api/courses/[courseId]/source-profiles/route.ts', "createSourceProfileSchema"), "Source profiles route validates with Zod");

// ─── 11. Phase 5–7 Regression ─────────────────────────────────────────────────
console.log('\n── 11. Phase 5–7 Regression ─────────────────────────────────────────────');

assert(fileExists('src/services/ai/agnesService.ts'), "agnesService.ts preserved");
assert(fileExists('src/services/ai/aiService.ts'), "aiService.ts preserved");
assert(fileExists('src/services/knowledge/conceptService.ts'), "conceptService.ts preserved");
assert(fileExists('src/services/materials/materialService.ts'), "materialService.ts preserved");
assert(fileContains('src/services/ai/agnesService.ts', "analyzeEducationalContext"), "Phase 7 analyzeEducationalContext preserved");
assert(fileContains('src/services/ai/agnesService.ts', "explainConceptFromSources"), "Phase 7 explainConceptFromSources preserved");
assert(fileContains('src/services/ai/agnesService.ts', "testAgnesConnection"), "Phase 7 testAgnesConnection preserved");
assert(fileContains('src/lib/firebase/converters.ts', "removeUndefinedFields"), "Phase 5 Firestore sanitization preserved");
assert(fileExists('src/app/api/ai/analyze/route.ts'), "Phase 7 /api/ai/analyze route preserved");
assert(fileExists('src/app/api/ai/explain/route.ts'), "Phase 7 /api/ai/explain route preserved");

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════');
console.log(`Phase 8 Results: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
