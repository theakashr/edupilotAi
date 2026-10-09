async function approveCandidates() {
  const courseId = '0t2Xfthm8ErbEEmB7pcS';
  
  // Actually, we don't have an endpoint to list candidates!
  // Let me just re-extract, the extract endpoint returns the candidates!
  const res = await fetch('http://localhost:3000/api/knowledge/extract-candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId })
  });
  const data = await res.json();
  
  if (!data.success) {
    console.error('Failed to extract:', data);
    return;
  }
  
  console.log(`Found ${data.candidates.length} candidates. Approving...`);
  
  for (const cand of data.candidates) {
    if (cand.status === 'pending') {
      const reviewRes = await fetch('http://localhost:3000/api/knowledge/candidates/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: cand.id,
          status: 'approved'
        })
      });
      const reviewData = await reviewRes.json();
      console.log(`Approved ${cand.id}:`, reviewData.success);
    }
  }
}

approveCandidates().catch(console.error);
