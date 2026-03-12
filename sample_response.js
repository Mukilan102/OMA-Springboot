import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
 
// ===== Metrics =====
const successfulSubmissions = new Counter('successful_submissions');
const failedSubmissions = new Counter('failed_submissions');
const questionsLoadTime = new Trend('questions_load_time');
const submitTime = new Trend('submit_time');
 
export let options = {
  stages: [
    // Gradual ramp up to 1000 users
    { duration: '2m', target: 100 },      // 0 → 100 users over 2 min
    { duration: '3m', target: 300 },      // 100 → 300 users over 3 min
    { duration: '3m', target: 600 },      // 300 → 600 users over 3 min
    { duration: '2m', target: 1000 },     // 600 → 1000 users over 2 min
    
    // Sustain 1000 concurrent users (critical test phase)
    { duration: '5m', target: 1000 },
    
    // Cool down
    { duration: '2m', target: 0 },
  ],
  
  // Performance thresholds
  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],   // Response time SLO
    'http_req_failed': ['rate<0.15'],                     // Error rate < 15%
  },
};
 
// ===== Helper Functions =====
 
function generateFreeText() {
  const templates = [
    "I believe the organization is moving in the right direction.",
    "Leadership demonstrates strong commitment to our values.",
    "Communication could be enhanced through regular feedback.",
    "I would recommend this organization as a great place to work.",
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}
 
function generateResponse(question) {
  const type = question.question_type;
  
  switch (type) {
    case 'single ans':
      if (question.options && question.options.length > 0) {
        return question.options[Math.floor(Math.random() * question.options.length)].option_id;
      }
      return null;
 
    case 'multi ans':
      if (question.options && question.options.length > 0) {
        const numAnswers = Math.min(2, question.options.length);
        const selected = [];
        const indices = new Set();
        
        while (selected.length < numAnswers && indices.size < question.options.length) {
          const idx = Math.floor(Math.random() * question.options.length);
          if (!indices.has(idx)) {
            indices.add(idx);
            selected.push(question.options[idx].option_id);
          }
        }
        return selected;
      }
      return [];
 
    case 'free text':
      return generateFreeText();
 
    case 'rank':
      if (question.options && question.options.length > 0) {
        const options = question.options.map(opt => opt.option_id);
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        return options;
      }
      return [];
 
    case 'likert':
      const likertResponse = {};
      if (question.sub_questions && question.sub_questions.length > 0) {
        question.sub_questions.forEach(subQ => {
          if (subQ.options && subQ.options.length > 0) {
            const randomOption = subQ.options[Math.floor(Math.random() * subQ.options.length)];
            likertResponse[subQ.sub_question_id.toString()] = randomOption.option_id;
          }
        });
      }
      return likertResponse;
 
    default:
      return null;
  }
}
 
// ===== Main Test Function =====
export default function () {
  const baseUrl = 'http://localhost:8080/api';
  const sessionId = `vu_${__VU}_${__ITER}_${Date.now()}`;
  const now = new Date().toISOString();
 
  group('📋 Full Survey Submission Flow - 1000 Concurrent Users', () => {
    // Step 1: Fetch all survey questions
    group('Step 1: Get Survey Questions', () => {
      const startTime = Date.now();
      const res = http.get(`${baseUrl}/category/allquestion`);
      const duration = Date.now() - startTime;
      questionsLoadTime.add(duration);
 
      check(res, {
        'questions loaded successfully': (r) => r.status === 200,
        'response contains data': (r) => r.body.length > 100,
      });
 
      if (res.status !== 200) {
        failedSubmissions.add(1);
        return;
      }
 
      // Parse questions
      let surveyData;
      try {
        surveyData = res.json();
      } catch (e) {
        console.error('Failed to parse survey:', e);
        failedSubmissions.add(1);
        return;
      }
 
      // User reading time
      sleep(2 + Math.random() * 2);
 
      // Step 2: Generate responses for all questions
      group('Step 2: Generate Responses', () => {
        const responses = {};
        let totalAnswered = 0;
 
        surveyData.forEach((category) => {
          if (!category.questions) return;
          category.questions.forEach((question) => {
            if (question.main_question_id) {
              const response = generateResponse(question);
              if (response !== null) {
                responses[question.main_question_id.toString()] = response;
                totalAnswered++;
              }
            }
          });
        });
 
        check({ answered: totalAnswered }, {
          'at least 50% of questions answered': (obj) => obj.answered >= 10,
        });
 
        if (totalAnswered === 0) {
          failedSubmissions.add(1);
          return;
        }
 
        // User finalizing responses
        sleep(1 + Math.random() * 2);
 
        // Step 3: Submit Survey
        group('Step 3: Submit Responses', () => {
          const submitPayload = {
            sessionId: sessionId,
            startedAt: new Date(Date.now() - 600000).toISOString(),  // Started 10 min ago
            submittedAt: now,
            responses: responses,
            consentGiven: true,
            consentAt: new Date(Date.now() - 300000).toISOString(),  // Consented 5 min ago
          };
 
          const startSubmit = Date.now();
          const submitRes = http.post(
            `${baseUrl}/survey/submit`,
            JSON.stringify(submitPayload),
            { headers: { 'Content-Type': 'application/json' } }
          );
          const submitDuration = Date.now() - startSubmit;
          submitTime.add(submitDuration);
 
          const isSuccess = submitRes.status === 200 || submitRes.status === 201;
 
          check(submitRes, {
            'survey submitted successfully': (r) => isSuccess,
            'response time < 3 seconds': (r) => r.timings.duration < 3000,
          });
 
          if (isSuccess) {
            successfulSubmissions.add(1);
          } else {
            failedSubmissions.add(1);
            console.error(`Submit failed: ${submitRes.status} - ${submitRes.body}`);
          }
        });
      });
    });
  });
 
  // Think time before next iteration
  sleep(1 + Math.random() * 2);
}