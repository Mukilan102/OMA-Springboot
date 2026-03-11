import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// ===== Custom Metrics =====
const successfulSubmissions = new Counter('successful_submissions');
const failedSubmissions = new Counter('failed_submissions');
const questionsLoadTime = new Trend('questions_load_time');
const submitTime = new Trend('submit_time');

// ===== Test Configuration =====
export let options = {
  scenarios: {
    survey_real_users: {
      executor: 'per-vu-iterations',
      vus: 1000,        // 1000 users
      iterations: 1,    // each user runs once
      maxDuration: '60s'
    }
  },

  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.15'],
  }
};

// ===== Helper Functions =====

function generateFreeText() {
  const templates = [
    "I believe the organization is moving in the right direction.",
    "Leadership demonstrates strong commitment to our values.",
    "Communication could be enhanced through regular feedback.",
    "I would recommend this organization as a great place to work."
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

function generateResponse(question) {
  const type = question.question_type;

  switch (type) {

    case 'single ans':
      if (question.options && question.options.length > 0) {
        return question.options[
          Math.floor(Math.random() * question.options.length)
        ].option_id;
      }
      return null;

    case 'multi ans':
      if (question.options && question.options.length > 0) {
        const numAnswers = Math.min(2, question.options.length);
        const selected = [];
        const used = new Set();

        while (selected.length < numAnswers) {
          const idx = Math.floor(Math.random() * question.options.length);
          if (!used.has(idx)) {
            used.add(idx);
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

        const options = question.options.map(o => o.option_id);

        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }

        return options;
      }
      return [];

    case 'likert':
      const likertResponse = {};

      if (question.sub_questions) {
        question.sub_questions.forEach(subQ => {

          if (subQ.options && subQ.options.length > 0) {

            const randomOption =
              subQ.options[Math.floor(Math.random() * subQ.options.length)];

            likertResponse[subQ.sub_question_id.toString()] =
              randomOption.option_id;
          }
        });
      }

      return likertResponse;

    default:
      return null;
  }
}

// ===== Main Test =====

export default function () {

  const baseUrl = 'http://localhost:8080/api';

  const sessionId = `vu_${__VU}_${Date.now()}`;
  const now = new Date().toISOString();

  group('Full Survey Submission Flow - 1000 Users', () => {

    // ===== Step 1 : Fetch Survey Questions =====
    const startTime = Date.now();

    const res = http.get(`${baseUrl}/category/allquestion`);

    const duration = Date.now() - startTime;

    questionsLoadTime.add(duration);

    check(res, {
      'questions loaded successfully': (r) => r.status === 200,
      'response has data': (r) => r.body && r.body.length > 50,
    });

    if (res.status !== 200) {
      failedSubmissions.add(1);
      return;
    }

    let surveyData;

    try {
      surveyData = res.json();
    } catch (e) {
      failedSubmissions.add(1);
      return;
    }

    if (!Array.isArray(surveyData)) {
      failedSubmissions.add(1);
      return;
    }

    // Simulate user reading time
    sleep(2 + Math.random() * 2);

    // ===== Step 2 : Generate Responses =====
    const responses = {};
    let totalAnswered = 0;

    surveyData.forEach(category => {

      if (!category.questions) return;

      category.questions.forEach(question => {

        if (!question.main_question_id) return;

        const response = generateResponse(question);

        if (response !== null) {
          responses[question.main_question_id.toString()] = response;
          totalAnswered++;
        }

      });

    });

    if (totalAnswered === 0) {
      failedSubmissions.add(1);
      return;
    }

    // User reviewing answers
    sleep(1 + Math.random() * 2);

    // ===== Step 3 : Submit Survey =====

    const payload = {
      sessionId: sessionId,
      startedAt: new Date(Date.now() - 600000).toISOString(),
      submittedAt: now,
      responses: responses,
      consentGiven: true,
      consentAt: new Date(Date.now() - 300000).toISOString()
    };

    const submitStart = Date.now();

    const submitRes = http.post(
      `${baseUrl}/survey/submit`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const submitDuration = Date.now() - submitStart;

    submitTime.add(submitDuration);

    const success =
      submitRes.status === 200 || submitRes.status === 201;

    check(submitRes, {
      'survey submitted successfully': () => success,
      'submit response < 3s': (r) => r.timings.duration < 3000,
    });

    if (success) {
      successfulSubmissions.add(1);
    } else {
      failedSubmissions.add(1);
    }

  });
}