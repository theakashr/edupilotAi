import { getFirebaseAdminApp } from '../src/lib/firebase/admin.js';
import { getFirestore } from 'firebase-admin/firestore';

async function diagnose() {
  try {
    const app = getFirebaseAdminApp();
    const db = getFirestore(app as any);
    console.log("Connected to Firestore.");

    // List all courses
    const courses = await db.collection('courses').get();
    console.log(`\n--- Courses (${courses.size}) ---`);
    courses.docs.forEach(c => {
        console.log(`ID: ${c.id}, Title: ${c.data().title}`);
    });

    // List materials
    const materials = await db.collection('materials').get();
    console.log(`\n--- Materials (${materials.size}) ---`);
    materials.docs.forEach(m => {
        console.log(`ID: ${m.id}, Course: ${m.data().courseId}, Status: ${m.data().status}, Title: ${m.data().title}`);
    });

    // List chunks
    const chunks = await db.collection('material_chunks').get();
    console.log(`\n--- Chunks (${chunks.size}) ---`);

    // List candidates
    const candidates = await db.collection('concept_candidates').get();
    console.log(`\n--- Concept Candidates (${candidates.size}) ---`);
    candidates.docs.forEach(c => {
        console.log(`ID: ${c.id}, Course: ${c.data().courseId}, Status: ${c.data().status}, Name: ${c.data().name}`);
    });

    // List concepts
    const concepts = await db.collection('concepts').get();
    console.log(`\n--- Concepts (${concepts.size}) ---`);
    concepts.docs.forEach(c => {
        console.log(`ID: ${c.id}, Course: ${c.data().courseId}, Name: ${c.data().name}, Status: ${c.data().status}`);
    });

  } catch (err) {
    console.error(err);
  }
}
diagnose();
