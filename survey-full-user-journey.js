/**
 * k6 Load Test: Full Survey User Journey
 * Tests realistic user behavior: Loading questions → Filling out all question types → Submitting
 * 
 * Load profile: 0→100→300→600→1000 concurrent users over 10 minutes, sustain for 5 minutes
 * Target: Test backend survey API capacity
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ===== Custom Metrics =====
const errorsCount = new Counter('errors_total');
const successCount = new Counter('success_total');
const questionsLoadedTrend = new Trend('questions_load_time');
const submitTrend = new Trend('submit_time');
const errorRate = new Rate('error_rate');

// ===== Configuration =====
export const options = {
  stages: [
    { duration: '2m', target: 100 },      // Ramp-up: 0 → 100 users
    { duration: '3m', target: 300 },      // Ramp-up: 100 → 300 users
    { duration: '3m', target: 600 },      // Ramp-up: 300 → 600 users
    { duration: '2m', target: 1000 },     // Ramp-up: 600 → 1000 users
    { duration: '5m', target: 1000 },     // Sustain: 1000 users (PEAK - critical phase)
    { duration: '2m', target: 0 },        // Ramp-down: 1000 → 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],  // Response time SLOs
    'http_req_failed': ['rate<0.15'],                    // Allow 15% failures at extreme load
    'error_rate': ['rate<0.15'],
  },
};

// ===== Helper Functions =====

/**
 * Generate fake free text response matching question context
 */
function generateFreeText() {
  const templates = [
    "I believe the organization is moving in the right direction with recent initiatives.",
    "The team collaboration has improved significantly over the past few months.",
    "Communication could be enhanced through more regular feedback sessions.",
    "Leadership demonstrates commitment to our organizational values.",
    "I would recommend this organization as a great place to work.",
    "The recent changes have positively impacted my role and responsibilities.",
    "We need better tools and resources to accomplish our goals effectively.",
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate random response based on question type
 */
function generateResponse(question) {
  const type = question.question_type;
  
  switch (type) {
    case 'single ans':
      // Return a random option ID from available options
      if (question.options && question.options.length > 0) {
        const randomOption = question.options[Math.floor(Math.random() * question.options.length)];
        return randomOption.option_id;
      }
      return null;

    case 'multi ans':
      // Return 1-3 random option IDs
      if (question.options && question.options.length > 0) {
        const numAnswers = Math.min(3, question.options.length);
        const selected = [];
        const indices = new Set();
        
        while (selected.length < numAnswers) {
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
      // Return generated free text response
      return generateFreeText();

    case 'rank':
      // Return all option IDs in random order
      if (question.options && question.options.length > 0) {
        const options = question.options.map(opt => opt.option_id);
        // Fisher-Yates shuffle
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        return options;
      }
      return [];

    case 'likert':
      // Return mapping of sub_question_id to option_id
      const likertResponse = {};
      if (question.sub_questions && question.sub_questions.length > 0) {
        question.sub_questions.forEach(subQ => {
          // Select a random option from the sub-question's options
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

/**
 * Validate response matches expected structure
 */
function isValidResponse(response) {
  if (response === null || response === undefined) return false;
  
  if (typeof response === 'number') return response > 0;                           // single answer
  if (typeof response === 'string') return response.trim().length > 0;            // free text
  if (Array.isArray(response)) return response.length > 0;                        // multi ans, rank
  if (typeof response === 'object' && !Array.isArray(response)) {
    // likert matrix
    return Object.keys(response).length > 0;
  }
  
  return false;
}

/**
 * Make API request with error handling
 */
function makeRequest(method, url, payload = null, headers = {}) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    timeout: '30s',
  };

  let response;
  try {
    if (method === 'GET') {
      response = http.get(url, params);
    } else if (method === 'POST') {
      response = http.post(url, JSON.stringify(payload), params);
    }
    return response;
  } catch (error) {
    console.error(`Request failed: ${method} ${url} - ${error}`);
    errorsCount.add(1);
    errorRate.add(1);
    return null;
  }
}

// ===== Main Test Function =====
export default function () {
  const baseUrl = 'http://localhost:8080/api';
  const userId = `user_${__VU}_${__ITER}`;
  const sessionId = `session_${__VU}_${__ITER}_${Date.now()}`;

  // Test timeline with think time between steps
  
  group('🔄 Fetch Survey Questions', () => {
    // Step 1: Get all survey questions
    const startTime = new Date();
    const response = makeRequest('GET', `${baseUrl}/category/allquestion`);
    const duration = new Date() - startTime;
    questionsLoadedTrend.add(duration);

    if (!response) {
      check(response, { 'questions fetch failed': (r) => !r });
      errorsCount.add(1);
      errorRate.add(1);
      return;
    }

    check(response, {
      'questions status is 200': (r) => r.status === 200,
      'questions response time < 3s': (r) => r.timings.duration < 3000,
      'response contains categories': (r) => r.body.includes('category') || r.body.includes('question'),
    });

    if (response.status !== 200) {
      errorsCount.add(1);
      errorRate.add(1);
      return;
    }

    // Parse questions for completing
    let surveyData;
    try {
      surveyData = response.json();
    } catch (e) {
      console.error('Failed to parse survey questions:', e);
      errorsCount.add(1);
      errorRate.add(1);
      return;
    }

    if (!surveyData || !Array.isArray(surveyData) || surveyData.length === 0) {
      console.error('Invalid survey data structure');
      errorsCount.add(1);
      errorRate.add(1);
      return;
    }

    // Think time: User reading questions
    sleep(__VU % 10 + 2);

    // ===== Build Responses =====
    group('📝 Generate Survey Responses', () => {
      const responses = {};
      let totalQuestions = 0;
      let respondedQuestions = 0;

      surveyData.forEach((category) => {
        if (!category.questions || !Array.isArray(category.questions)) return;

        category.questions.forEach((question) => {
          totalQuestions++;
          
          if (!question.main_question_id) {
            console.warn('Question missing main_question_id:', question);
            return;  // Skip questions without proper ID
          }

          const questionId = question.main_question_id;
          const response = generateResponse(question);

          if (isValidResponse(response)) {
            responses[questionId.toString()] = response;
            respondedQuestions++;
          }
        });
      });

      check({ count: respondedQuestions }, {
        'at least 80% of questions answered': (obj) => (obj.count / Math.max(totalQuestions, 1)) >= 0.8,
        'some questions answered': (obj) => obj.count > 0,
      });

      if (respondedQuestions === 0) {
        errorsCount.add(1);
        errorRate.add(1);
        return;
      }

      // Think time: User finalizing responses
      sleep(__VU % 5 + 1);

      // ===== Submit Survey =====
      group('✅ Submit Survey', () => {
        const now = new Date().toISOString();
        const submitPayload = {
          sessionId: sessionId,                               // camelCase!
          startedAt: new Date(Date.now() - 600000).toISOString(),  // Started 10 min ago
          submittedAt: now,
          responses: responses,
          consentGiven: true,
          consentAt: new Date(Date.now() - 300000).toISOString(),  // Consented 5 min ago
        };

        const startSubmit = new Date();
        const submitResponse = makeRequest('POST', `${baseUrl}/survey/submit`, submitPayload);
        const submitDuration = new Date() - startSubmit;
        submitTrend.add(submitDuration);

        if (!submitResponse) {
          check(submitResponse, { 'submit failed': (r) => !r });
          errorsCount.add(1);
          errorRate.add(1);
          return;
        }

        check(submitResponse, {
          'submit status is 200 or 201': (r) => r.status === 200 || r.status === 201,
          'submit response time < 5s': (r) => r.timings.duration < 5000,
          'submit returns success message': (r) => 
            r.body.includes('success') || r.body.includes('submitted') || r.status === 201,
        });

        if (submitResponse.status !== 200 && submitResponse.status !== 201) {
          console.error(`Submit failed: ${submitResponse.status}`);
          console.error(`Response body: ${submitResponse.body}`);
          errorsCount.add(1);
          errorRate.add(1);
        } else {
          successCount.add(1);
        }
      });
    });
  });

  // Total think time between full surveys
  sleep(__VU % 5 + 2);
}

/**
 * Teardown: Optional cleanup (runs once at end)
 */
export function teardown(data) {
  console.log('Test complete');
  console.log(`Total successes: ${successCount.value}`);
  console.log(`Total errors: ${errorsCount.value}`);
}

/**
 * handleSummary: Custom summary report
 */
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || ' ';
  let summary = '\n\n=== Test Results ===\n';
  
  if (data.metrics) {
    Object.keys(data.metrics).forEach((metric) => {
      const metricData = data.metrics[metric];
      if (metricData.values) {
        summary += `${metric}: ${JSON.stringify(metricData.values)}\n`;
      }
    });
  }

  return summary;
}
