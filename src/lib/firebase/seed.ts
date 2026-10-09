import { courseService } from '@/services/courses/courseService';
import { materialService } from '@/services/materials/materialService';
import { assessmentService } from '@/services/assessments/assessmentService';
import { learningService } from '@/services/learning/learningService';
import { communicationService } from '@/services/communication/communicationService';
import { aiService } from '@/services/ai/aiService';

/**
 * Utility to seed foundational demo data for developer testing and demonstration.
 * Can be executed in a development or test environment.
 */
export async function seedDemoData(teacherId: string, studentId: string) {
  // 1. Create a Demo Course
  const courseRes = await courseService.createCourse({
    title: 'CS 101: Introduction to Computer Systems & Architecture',
    description: 'Foundations of computer systems, memory hierarchy, CPU design, and machine-level programming.',
    subject: 'Computer Science',
    teacherId,
    status: 'active',
    language: 'en',
  });

  if (!courseRes.success) {
    throw new Error(`Failed to seed course: ${courseRes.error}`);
  }

  const course = courseRes.data;

  // 2. Enroll the student
  await courseService.enrollStudent(course.id, studentId);

  // 3. Create Concepts (Knowledge Graph)
  const concept1 = await learningService.createConcept({
    courseId: course.id,
    name: 'Pointers & Memory Addressing',
    description: 'Understanding memory addresses, pointer arithmetic, and reference semantics.',
    difficulty: 6,
  });

  const concept2 = await learningService.createConcept({
    courseId: course.id,
    name: 'Stack vs Heap Allocation',
    description: 'Dynamic memory allocation mechanisms, memory leaks, and stack frames.',
    difficulty: 7,
    prerequisiteConceptIds: concept1.success ? [concept1.data.id] : [],
  });

  // 4. Create Material Record
  const material = await materialService.createMaterial({
    courseId: course.id,
    uploadedBy: teacherId,
    title: 'Chapter 2: Memory Hierarchy & Cache Design',
    description: 'Core reading on cache performance, spatial and temporal locality.',
    type: 'pdf',
    storagePath: `courses/${course.id}/materials/chapter2.pdf`,
    fileName: 'chapter2.pdf',
    fileSize: 2048576,
    mimeType: 'application/pdf',
    status: 'ready',
    version: 1,
  });

  if (material.success) {
    await materialService.createMaterialChunk({
      materialId: material.data.id,
      courseId: course.id,
      chunkIndex: 0,
      text: 'Memory hierarchy organizes storage according to access latency, spanning registers, L1-L3 cache, RAM, and SSD.',
      pageNumber: 1,
      sectionTitle: '2.1 Overview of Storage Hierarchy',
    });
  }

  // 5. Create Assessment
  const assessment = await assessmentService.createAssessment({
    courseId: course.id,
    teacherId,
    title: 'Quiz 1: Memory Fundamentals',
    description: 'Assess understanding of basic memory management and pointer semantics.',
    type: 'quiz',
    difficulty: 'medium',
    totalMarks: 20,
    status: 'published',
  });

  // 6. Create Student Learning Profile & Gap
  if (concept1.success) {
    await learningService.upsertLearningProfile(studentId, course.id, {
      preferredLanguage: 'en',
      learningPreferences: {
        preferredContentType: 'visual_breakdown',
        preferredDifficulty: 'medium',
      },
      overallMastery: 72,
    });

    await learningService.createLearningGap({
      studentId,
      courseId: course.id,
      conceptId: concept1.data.id,
      currentMastery: 45,
      riskLevel: 'medium',
      predicted: true,
      reason: 'Struggled with pointer arithmetic on practice diagnostic.',
      evidence: ['Diagnostic Quiz: Question 4 Incorrect', 'Material 1: Review time < 2 mins'],
      status: 'open',
    });
  }

  // 7. Create AI Co-Pilot Recommendation (Human-in-the-Loop)
  await aiService.createRecommendation({
    courseId: course.id,
    studentId,
    type: 'intervention',
    title: 'Recommend Visual Memory Map Practice',
    explanation: 'Student demonstrates 45% mastery on Pointers & Memory Addressing. Interactive visual trace will accelerate retention.',
    priority: 'high',
    status: 'pending',
    createdBy: 'ai',
  });

  // 8. Announcement & Notification
  await communicationService.createAnnouncement({
    courseId: course.id,
    teacherId,
    title: 'Welcome to CS 101!',
    message: 'Welcome everyone! Please review Chapter 2 and complete Quiz 1 by Friday.',
    target: 'course',
    isPublished: true,
  });

  await communicationService.createNotification({
    recipientId: studentId,
    type: 'announcement',
    title: 'New Announcement in CS 101',
    message: 'Welcome to CS 101! Please review Chapter 2.',
    referenceId: course.id,
    isRead: false,
  });

  return {
    courseId: course.id,
    conceptIds: [concept1.success ? concept1.data.id : null, concept2.success ? concept2.data.id : null].filter(Boolean),
    assessmentId: assessment.success ? assessment.data.id : null,
  };
}
