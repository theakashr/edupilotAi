const http = require('http');

const data = JSON.stringify({
  courseId: "mock-course-id",
  conceptId: "mock-concept",
  question: "What is this?"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai/agnes/tutor',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-user-id': 'mock-student-id'
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
