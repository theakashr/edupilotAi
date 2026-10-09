const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyAK77523U2xVWXmhIVZs6pCFxgcW3GdFtU",
  authDomain: "edupilot-a.firebaseapp.com",
  projectId: "edupilot-a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function test() {
  try {
    await signInAnonymously(auth);
    console.log("Authenticated anonymously");
    const q = query(
      collection(db, 'assessments'),
      where('status', '==', 'published')
    );
    const snap = await getDocs(q);
    console.log("Success! Published Docs:", snap.docs.length);
    snap.docs.forEach(d => console.log("Doc:", d.id, "Course:", d.data().courseId));
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}
test();
