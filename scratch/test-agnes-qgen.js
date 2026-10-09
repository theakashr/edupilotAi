const http = require('http');

const data = JSON.stringify({
  courseId: "mock-course-id",
  count: 4,
  difficulty: "medium"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai/assessments/generate-questions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-user-id': 'mock-teacher-id'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`BODY: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
