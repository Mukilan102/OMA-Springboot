import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// ===== Custom Metrics =====
const successfulSubmissions = new Counter('successful_submissions');
const failedSubmissions = new Counter('failed_submissions');
const questionsLoadTime = new Trend('questions_load_time');
const submitTime = new Trend('submit_time');

// ===== Real World Test Configuration =====
export const options = {

  scenarios: {

    survey_5000_users: {

      executor: 'ramping-arrival-rate',

      startRate: 10,
      timeUnit: '1s',

      preAllocatedVUs: 500,
      maxVUs: 5000,

      stages: [

        { target: 20, duration: '30s' },   // 20 users/sec
        { target: 50, duration: '30s' },   // 50 users/sec
        { target: 80, duration: '30s' },   // 80 users/sec
        { target: 100, duration: '30s' }   // peak load

      ],

      gracefulStop: '10s'
    }

  },

  thresholds: {

    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000']

  }

};

// ===== Helper Functions =====

function generateFreeText() {
  const templates = [
    "The organization demonstrates strong leadership.",
    "Communication across departments is effective.",
    "Innovation culture is improving significantly.",
    "Employees feel valued and supported."
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

function generateResponse(question) {

  const type = question.question_type;

  switch (type) {

    case 'single ans':
      if (question.options?.length) {
        return question.options[
          Math.floor(Math.random() * question.options.length)
        ].option_id;
      }
      return null;

    case 'multi ans':
      if (question.options?.length) {

        const selected = [];
        const count = Math.min(2, question.options.length);

        while (selected.length < count) {

          const option =
            question.options[Math.floor(Math.random() * question.options.length)];

          if (!selected.includes(option.option_id)) {
            selected.push(option.option_id);
          }
        }

        return selected;
      }
      return [];

    case 'free text':
      return generateFreeText();

    case 'rank':
      if (question.options?.length) {

        const options = question.options.map(o => o.option_id);

        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }

        return options;
      }
      return [];

    case 'likert':

      const likert = {};

      if (question.sub_questions) {

        question.sub_questions.forEach(sub => {

          if (sub.options?.length) {

            const random =
              sub.options[Math.floor(Math.random() * sub.options.length)];

            likert[sub.sub_question_id] = random.option_id;
          }

        });
      }

      return likert;

    default:
      return null;
  }
}

// ===== Main Test =====

export default function () {

  const baseUrl = 'http://localhost:8080/api';

  const sessionId = `user_${__VU}_${Date.now()}`;

  group('Real User Survey Flow', () => {

    // ===== Load Questions =====

    const start = Date.now();

    const res = http.get(`${baseUrl}/category/allquestion`);

    questionsLoadTime.add(Date.now() - start);

    const success = check(res, {
      'questions loaded': (r) => r.status === 200
    });

    if (!success) {
      failedSubmissions.add(1);
      return;
    }

    const surveyData = res.json();

    // Simulate reading time
    sleep(2 + Math.random() * 4);

    // ===== Generate Answers =====

    const responses = {};

    surveyData.forEach(category => {

      if (!category.questions) return;

      category.questions.forEach(question => {

        const answer = generateResponse(question);

        if (answer !== null) {
          responses[question.main_question_id] = answer;
        }

      });

    });

    sleep(1 + Math.random() * 3);

    // ===== Submit Survey =====

    const payload = JSON.stringify({
      sessionId: sessionId,
      startedAt: new Date(Date.now() - 600000).toISOString(),
      submittedAt: new Date().toISOString(),
      responses: responses,
      consentGiven: true,
      consentAt: new Date().toISOString()
    });

    const submitStart = Date.now();

    const submitRes = http.post(
      `${baseUrl}/survey/submit`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    submitTime.add(Date.now() - submitStart);

    const submitted = check(submitRes, {
      'survey submitted': (r) => r.status === 200 || r.status === 201
    });

    if (submitted) {
      successfulSubmissions.add(1);
    } else {
      failedSubmissions.add(1);
    }

  });

}