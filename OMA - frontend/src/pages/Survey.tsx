import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import apiClient from "../config/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, WifiOff, RefreshCw, AlertCircle, Heart } from "lucide-react";
import logo from "../assets/HARTS Consulting LBG.png";
import { QuestionRenderer } from "../components/survey";

import type { SurveyCategory, SurveyQuestion, SurveyQuestionType, ResponseValue } from "../types/survey";

// ── localStorage keys ──
const LS_RESPONSES  = "oma_survey_responses";
const LS_POSITION   = "oma_survey_position";
const LS_SESSION_ID = "oma_session_id";
const LS_STARTED_AT = "oma_survey_started_at";
const LS_SUBMITTED  = "oma_survey_submitted";
const LS_TOUR_DONE  = "oma_nav_tour_done";
const FREE_TEXT_MAX_LENGTH = 5000; // hard cap on free-text before it reaches the DB

// ── Cookie helpers ──
function setCookie(name: string, value: string, days = 30) {
  const d = new Date();
  d.setTime(d.getTime() + days * 86_400_000);
  const secure = window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Strict${secure}`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// ── Helpers ──
function generateSessionId(): string {
  // Use cryptographically secure random UUID where available, fall back to Math.random
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `anon-${uuid}`;
}

// ── Validate & sanitize a single response value ──
// Returns the value if it looks correct, undefined if it is malformed/tampered.
function sanitizeResponseValue(val: unknown): ResponseValue | undefined {
  if (val === null || val === undefined) return undefined;
  // number  → single ans option id
  if (typeof val === "number" && Number.isFinite(val) && val > 0) return val;
  // string  → free text (trim + cap length)
  if (typeof val === "string") return val.slice(0, FREE_TEXT_MAX_LENGTH);
  if (Array.isArray(val)) {
    // number[] → multi ans or rank
    if (val.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0))
      return val as number[];
    return undefined;
  }
  if (typeof val === "object") {
    // Record<number, number> → likert
    const entries = Object.entries(val as Record<string, unknown>);
    if (
      entries.every(
        ([k, v]) =>
          /^\d+$/.test(k) &&
          typeof v === "number" &&
          Number.isFinite(v) &&
          v > 0
      )
    ) {
      return val as Record<number, number>;
    }
    return undefined;
  }
  return undefined;
}

// ── Validate the entire responses map coming from localStorage or DB ──
function sanitizeResponses(raw: unknown): Record<string, ResponseValue> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, ResponseValue> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    // Keys should be numeric question ids
    if (!/^\d+$/.test(key)) continue;
    const clean = sanitizeResponseValue(val);
    if (clean !== undefined) result[key] = clean;
  }
  return result;
}

function getOrCreateSessionId(): string {
  // Priority: localStorage → cookie → create new
  const fromLS = localStorage.getItem(LS_SESSION_ID);
  if (fromLS) {
    setCookie("oma_session_id", fromLS); // keep cookie in sync
    return fromLS;
  }
  const fromCookie = getCookie("oma_session_id");
  if (fromCookie) {
    localStorage.setItem(LS_SESSION_ID, fromCookie); // restore to localStorage
    return fromCookie;
  }
  const id = generateSessionId();
  localStorage.setItem(LS_SESSION_ID, id);
  setCookie("oma_session_id", id);
  return id;
}

function loadSavedResponses(): Record<string, ResponseValue> {
  try {
    const raw = localStorage.getItem(LS_RESPONSES);
    if (!raw) return {};
    return sanitizeResponses(JSON.parse(raw));
  } catch {
    return {};
  }
}

function loadSavedPosition(): { categoryIndex: number; questionIndex: number } | null {
  try {
    const raw = localStorage.getItem(LS_POSITION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSurveyStorage() {
  // Clear answer data and progress — but intentionally KEEP LS_SESSION_ID and the
  // session cookie so the DB can still identify this browser on future visits and
  // return submitted:true, blocking re-submission even if LS_SUBMITTED is cleared.
  localStorage.removeItem(LS_RESPONSES);
  localStorage.removeItem(LS_POSITION);
  localStorage.removeItem(LS_STARTED_AT);
  localStorage.removeItem(LS_SUBMITTED);
}

// ── Helper: Check if a question is answered ──
function isQuestionAnswered(question: SurveyQuestion, response: ResponseValue | undefined): boolean {
  if (response === undefined || response === null) return false;
  switch (question.question_type) {
    case "single ans":
      return typeof response === "number";
    case "multi ans":
      return Array.isArray(response) && response.length > 0;
    case "free text":
      return typeof response === "string" && response.trim().length > 0;
    case "rank":
      return Array.isArray(response) && response.length > 0;
    case "likert":
      return (
        typeof response === "object" &&
        !Array.isArray(response) &&
        Object.keys(response).length === question.sub_questions.length
      );
    default:
      return false;
  }
}

export default function Survey() {
  const [surveyData, setSurveyData] = useState<SurveyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(() => localStorage.getItem(LS_SUBMITTED) === "true");

  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [rankConfirmOpen, setRankConfirmOpen] = useState(false);
  const [rankReordered, setRankReordered] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [showNavTour, setShowNavTour] = useState(() => {
    // Tour is only for small screens (< 768px)
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) return false;
    return localStorage.getItem(LS_TOUR_DONE) !== "true";
  });
  const [tourPhase, setTourPhase] = useState<'scroll' | 'colors' | 'done'>('scroll');
  const navStripRef = useRef<HTMLDivElement>(null);

  const sessionId = useRef(getOrCreateSessionId());
  const restoredPosition = useRef(false);
  const pendingDBSaves = useRef<Array<{ mainQuestionId: number; answer: ResponseValue }>>([]);

  // ── Reset rank-reorder tracking + scroll to top whenever the question changes ──
  useEffect(() => {
    setRankReordered(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentCategoryIndex, currentQuestionIndex]);

  // ── Navigator tour: full motion sequence (scroll → color pulse → done) — mobile only ──
  useEffect(() => {
    if (!showNavTour || !navStripRef.current) return;
    // Only run on small screens (< 768px); on desktop the scrollbar is visible and strip is spacious
    if (window.matchMedia('(min-width: 768px)').matches) {
      setShowNavTour(false);
      localStorage.setItem(LS_TOUR_DONE, 'true');
      return;
    }
    const el = navStripRef.current;
    let cancelled = false;

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const run = async () => {
      // Phase 1: Scroll demo
      setTourPhase('scroll');
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll > 0) {
        await wait(600);
        if (cancelled) return;
        el.scrollTo({ left: maxScroll, behavior: 'smooth' });
        await wait(1400);
        if (cancelled) return;
        el.scrollTo({ left: 0, behavior: 'smooth' });
        await wait(1000);
        if (cancelled) return;
      } else {
        await wait(600);
        if (cancelled) return;
      }

      // Phase 2: Color pulse
      setTourPhase('colors');
      await wait(3000);
      if (cancelled) return;

      // Done
      setTourPhase('done');
      setShowNavTour(false);
      localStorage.setItem(LS_TOUR_DONE, 'true');
    };

    run();
    return () => { cancelled = true; };
  }, [showNavTour]);

  const dismissTour = () => {
    setShowNavTour(false);
    localStorage.setItem(LS_TOUR_DONE, "true");
  };

  // ── Track online/offline status ──
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setSaveStatus("idle");
      // Flush any pending saves that failed while offline
      flushPendingSaves();
    };
    const goOffline = () => {
      setIsOnline(false);
      setSaveStatus("offline");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flatten all questions for progress calculation
  const allQuestions = useMemo(() => {
    return surveyData.flatMap((cat) => cat.questions);
  }, [surveyData]);

  // ── Flush pending DB saves (queued while offline) ──
  const flushPendingSaves = useCallback(() => {
    const pending = [...pendingDBSaves.current];
    pendingDBSaves.current = [];
    for (const { mainQuestionId, answer } of pending) {
      apiClient.fetch("/survey/save-answer", {
        method: "POST",
        body: JSON.stringify({
          sessionId: sessionId.current,
          startedAt: localStorage.getItem(LS_STARTED_AT),
          mainQuestionId,
          answer,
        }),
      }).catch(() => {
        // Re-queue if still failing
        pendingDBSaves.current.push({ mainQuestionId, answer });
      });
    }
  }, []);

  // ── Fetch survey data & restore saved state ──
  useEffect(() => {
    // Record start time if first visit
    if (!localStorage.getItem(LS_STARTED_AT)) {
      localStorage.setItem(LS_STARTED_AT, new Date().toISOString());
    }

    apiClient.fetch("/category/allquestion")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load survey data");
        return res.json();
      })
      .then(async (data: SurveyCategory[]) => {
        setSurveyData(data);

        // 1️⃣ ALWAYS check DB first — session ID is the authoritative submitted gate.
        //    This prevents someone from clearing LS_SUBMITTED and retaking the survey,
        //    because the DB flag is set server-side and cannot be tampered with client-side.
        try {
          const sid = sessionId.current;
          const dbRes = await apiClient.fetch(`/survey/session/${encodeURIComponent(sid)}/responses`);
          if (dbRes.ok) {
            const dbData = await dbRes.json();

            // DB says submitted → block unconditionally, no matter what localStorage says
            if (dbData.submitted) {
              localStorage.setItem(LS_SUBMITTED, "true");
              setSubmitted(true);
              setLoading(false);
              return;
            }

            // DB has in-progress responses → use them (they may be more complete than localStorage)
            if (dbData.found && dbData.responses && Object.keys(dbData.responses).length > 0) {
              const clean = sanitizeResponses(dbData.responses);
              setResponses(clean);
              localStorage.setItem(LS_RESPONSES, JSON.stringify(clean));
              if (dbData.startedAt) {
                localStorage.setItem(LS_STARTED_AT, dbData.startedAt);
              }
              restorePosition(data);
              setLoading(false);
              return;
            }
          }
        } catch {
          // DB unreachable — fall back to localStorage so the user isn't blocked offline
        }

        // 2️⃣ DB check passed (or offline) — use localStorage responses if present
        const savedResponses = loadSavedResponses();
        if (Object.keys(savedResponses).length > 0) {
          setResponses(savedResponses);
          restorePosition(data);
          setLoading(false);
          return;
        }

        // 3️⃣ Nothing anywhere — fresh start
        restorePosition(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    function restorePosition(data: SurveyCategory[]) {
      if (!restoredPosition.current) {
        const savedPos = loadSavedPosition();
        if (savedPos) {
          const maxCat = data.length - 1;
          const catIdx = Math.min(savedPos.categoryIndex, maxCat);
          const maxQ = (data[catIdx]?.questions.length ?? 1) - 1;
          const qIdx = Math.min(savedPos.questionIndex, maxQ);
          setCurrentCategoryIndex(catIdx);
          setCurrentQuestionIndex(qIdx);
        }
        restoredPosition.current = true;
      }
    }
  }, []);

  // ── Immediate autosave to localStorage ──
  const saveIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading || surveyData.length === 0) return;

    // Save to localStorage immediately (fast, no debounce)
    if (isOnline) setSaveStatus("saving");
    try {
      localStorage.setItem(LS_RESPONSES, JSON.stringify(responses));
      localStorage.setItem(
        LS_POSITION,
        JSON.stringify({ categoryIndex: currentCategoryIndex, questionIndex: currentQuestionIndex })
      );
    } catch {
      // localStorage full or unavailable - silently ignore
    }
    if (isOnline) {
      setSaveStatus("saved");
      if (saveIndicatorRef.current) clearTimeout(saveIndicatorRef.current);
      saveIndicatorRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, currentCategoryIndex, currentQuestionIndex, loading, surveyData.length]);

  // Unanswered questions — drives the completion dialog and count
  const unansweredQuestions = useMemo(() => {
    return allQuestions.filter(
      (q) => !isQuestionAnswered(q, responses[String(q.main_question_id)])
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allQuestions, responses]);

  const unansweredCount = unansweredQuestions.length;



  // ── Immediate DB save (fire-and-forget on every navigation) ──
  const saveAnswerToDB = useCallback(
    (mainQuestionId: number, answer: ResponseValue) => {
      if (!navigator.onLine) {
        pendingDBSaves.current.push({ mainQuestionId, answer });
        return;
      }
      apiClient.fetch("/survey/save-answer", {
        method: "POST",
        body: JSON.stringify({
          sessionId: sessionId.current,
          startedAt: localStorage.getItem(LS_STARTED_AT),
          mainQuestionId,
          answer,
        }),
      }).catch(() => {
        pendingDBSaves.current.push({ mainQuestionId, answer });
      });
    },
    []
  );

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#008489] mx-auto" />
          <p className="text-[#4A4A4A]">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error || surveyData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-lg text-center space-y-6">
          <p className="text-red-500 text-lg">{error || "No survey data available"}</p>
          <p className="text-sm text-[#4A4A4A]">
            Your answers are safely stored in your browser and will not be lost.
          </p>
          <Button
            onClick={() => { setError(null); setSubmitting(false); window.location.reload(); }}
            className="gap-2 bg-[#002D72] hover:bg-[#001f52]"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Thank-you screen after successful submit ──
  if (submitted) {
    return <ThankYouScreen />;
  }

  const currentCategory = surveyData[currentCategoryIndex];
  const currentQuestion = currentCategory.questions[currentQuestionIndex];
  const responseKey = String(currentQuestion.main_question_id);
  const currentResponse = responses[responseKey];

  const totalQuestions = allQuestions.length;
  const answeredQuestions = Object.keys(responses).filter((key) => {
    const resp = responses[key];
    if (resp === undefined || resp === null) return false;
    if (typeof resp === "string") return resp.trim().length > 0;
    if (Array.isArray(resp)) return resp.length > 0;
    return true;
  }).length;
  const progressPercent = (answeredQuestions / totalQuestions) * 100;

  const handleResponseChange = (value: ResponseValue | undefined) => {
    if (value === undefined) {
      // Deselect: remove this question's response entirely
      const updated = { ...responses };
      delete updated[responseKey];
      setResponses(updated);
      return;
    }
    // Sanitize free-text before storing
    const clean: ResponseValue =
      typeof value === "string" ? value.slice(0, FREE_TEXT_MAX_LENGTH) : value;
    setResponses({ ...responses, [responseKey]: clean });
    // Detect if a rank question's order has been changed from the default
    if (currentQuestion.question_type === "rank") {
      const defaultOrder = currentQuestion.options.map((o) => o.option_id);
      const newOrder = clean as number[];
      const modified = newOrder.length > 0 && newOrder.some((id, i) => id !== defaultOrder[i]);
      if (modified) setRankReordered(true);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        sessionId: sessionId.current,
        startedAt: localStorage.getItem(LS_STARTED_AT),
        submittedAt: new Date().toISOString(),
        responses,
      };
      const res = await apiClient.fetch("/survey/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Submission failed");

      // Clear saved progress after successful submit
      clearSurveyStorage();
      localStorage.setItem(LS_SUBMITTED, "true");
      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit survey. Your answers are saved locally - please try again.");
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    const isRankQuestion = currentQuestion.question_type === "rank";

    // For unmodified rank questions, confirm before proceeding
    if (isRankQuestion && !rankReordered) {
      const existingRankAnswer = responses[responseKey];
      if (existingRankAnswer) {
        // Already answered on a previous visit — no dialog needed, just navigate
        saveAnswerToDB(currentQuestion.main_question_id, existingRankAnswer as ResponseValue);
        // Fall through to normal navigation below
      } else {
        // First time hitting Next without reordering — auto-record default & ask
        const defaultOrder = currentQuestion.options.map((o) => o.option_id);
        setResponses((prev) => ({ ...prev, [responseKey]: defaultOrder }));
        saveAnswerToDB(currentQuestion.main_question_id, defaultOrder);
        setRankConfirmOpen(true);
        return;
      }
    }

    // On the last question open the completion / confirm dialog instead of submitting
    if (isLastQuestion) {
      const ans = responses[responseKey];
      if (ans !== undefined && ans !== null) {
        saveAnswerToDB(currentQuestion.main_question_id, ans);
      }
      if (unansweredCount > 0) {
        setCompletionDialogOpen(true);
      } else {
        setSubmitConfirmOpen(true);
      }
      return;
    }

    doNavigateNext();
  };

  const doNavigateNext = () => {
    // Save current answer to DB immediately
    const currentAnswer = responses[responseKey];
    if (currentAnswer !== undefined && currentAnswer !== null) {
      saveAnswerToDB(currentQuestion.main_question_id, currentAnswer);
    }

    if (currentQuestionIndex < currentCategory.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentCategoryIndex < surveyData.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
      setCurrentQuestionIndex(0);
    }
    // Last-question submission is handled via the completion/confirm dialogs
  };

  const navigateToQuestion = (question: SurveyQuestion) => {
    setCompletionDialogOpen(false);
    for (let ci = 0; ci < surveyData.length; ci++) {
      const qi = surveyData[ci].questions.findIndex(
        (q) => q.main_question_id === question.main_question_id
      );
      if (qi !== -1) {
        setCurrentCategoryIndex(ci);
        setCurrentQuestionIndex(qi);
        return;
      }
    }
  };

  // Navigate to a question by its global index (0-based across all categories)
  const navigateToGlobalIndex = (globalIdx: number) => {
    let idx = 0;
    for (let ci = 0; ci < surveyData.length; ci++) {
      for (let qi = 0; qi < surveyData[ci].questions.length; qi++) {
        if (idx === globalIdx) {
          setCurrentCategoryIndex(ci);
          setCurrentQuestionIndex(qi);
          return;
        }
        idx++;
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
      setCurrentQuestionIndex(
        surveyData[currentCategoryIndex - 1].questions.length - 1
      );
    }
  };
  const canGoPrevious = currentCategoryIndex > 0 || currentQuestionIndex > 0;
  const isLastQuestion =
    currentCategoryIndex === surveyData.length - 1 &&
    currentQuestionIndex === currentCategory.questions.length - 1;
  // Rank questions are always enabled (dialog handles unmodified confirmation)
  // const canGoNext = isRank || currentAnswered;
  const canGoNext = true;
  const getQuestionTypeLabel = (type: SurveyQuestionType) => {
    switch (type) {
      case "single ans":
        return "Choose one";
      case "multi ans":
        return "Select all that apply";
      case "free text":
        return "Open response";
      case "rank":
        return "Rank in order";
      case "likert":
        return "Rate each statement";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm animate-fade-in-down overflow-visible">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="OMA Tool Logo" className="h-10 w-auto" />
              <h1 className="text-2xl font-light tracking-wider text-[#002D72]">
                OMA
              </h1>
            </div>
            {/* Autosave indicator */}
            <div className="flex items-center gap-2 text-xs text-[#4A4A4A]/70">
              {!isOnline && (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600">Offline — saved locally</span>
                </>
              )}
              {isOnline && saveStatus === "saving" && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {isOnline && saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600">Progress saved</span>
                </>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#4A4A4A]">
                Category {currentCategoryIndex + 1} of {surveyData.length}
              </span>
              <span className="text-[#4A4A4A]">
                {answeredQuestions} / {totalQuestions} questions answered
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* ── Question Navigator Strip ── */}
          <div className={`mt-4 md:mt-7 mb-1 overflow-visible relative transition-all duration-500 ${showNavTour ? 'z-[70]' : ''}`}>
            <div
              ref={navStripRef}
              className="flex gap-1.5 sm:gap-2 md:gap-3.5 overflow-x-auto overflow-y-visible px-3 pt-2 pb-2 hide-scrollbar md:scrollbar-thin"
            >
              {allQuestions.map((q, globalIdx) => {
                const answered = isQuestionAnswered(q, responses[String(q.main_question_id)]);
                const isCurrent = q.main_question_id === currentQuestion?.main_question_id;
                // Find category name for tooltip
                const catName = surveyData.find((c) =>
                  c.questions.some((cq) => cq.main_question_id === q.main_question_id)
                )?.category_text ?? "";
                return (
                  <button
                    key={q.main_question_id}
                    type="button"
                    onClick={() => { if (!showNavTour) navigateToGlobalIndex(globalIdx); }}
                    title={`Q${globalIdx + 1}: ${catName} — ${q.question_text.slice(0, 60)}${q.question_text.length > 60 ? '…' : ''}`}
                    className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 rounded-full text-[10px] sm:text-[11px] md:text-[14px] font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#008489]/40
                      ${isCurrent
                        ? 'bg-[#002D72] text-white ring-2 ring-[#002D72]/30 scale-110 md:scale-125'
                        : answered
                          ? 'bg-[#008489] text-white hover:scale-110 md:hover:scale-125'
                          : 'bg-gray-200 text-[#4A4A4A] hover:bg-gray-300 hover:scale-110 md:hover:scale-125'
                      }
                      ${showNavTour && tourPhase === 'colors' && isCurrent ? 'animate-tour-pulse-current' : ''}
                      ${showNavTour && tourPhase === 'colors' && answered && !isCurrent ? 'animate-tour-pulse-answered' : ''}
                      ${showNavTour && tourPhase === 'colors' && !answered && !isCurrent ? 'animate-tour-pulse-unanswered' : ''}
                    `}
                  >
                    {globalIdx + 1}
                  </button>
                );
              })}
            </div>

            {/* Floating color labels during tour color phase */}
            {showNavTour && tourPhase === 'colors' && (
              <div className="flex items-center justify-center gap-4 sm:gap-6 mt-2 pb-1 animate-tour-labels-in">
                <span className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full shadow-md border border-[#002D72]/20 text-[10px] sm:text-xs font-medium text-[#002D72]">
                  <span className="w-3 h-3 rounded-full bg-[#002D72] animate-pulse"></span> Current
                </span>
                <span className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full shadow-md border border-[#008489]/20 text-[10px] sm:text-xs font-medium text-[#008489]">
                  <span className="w-3 h-3 rounded-full bg-[#008489] animate-pulse"></span> Answered
                </span>
                <span className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full shadow-md border border-gray-300 text-[10px] sm:text-xs font-medium text-[#4A4A4A]">
                  <span className="w-3 h-3 rounded-full bg-gray-200 animate-pulse"></span> Unanswered
                </span>
              </div>
            )}

            {/* Scroll hint text during scroll phase */}
            {showNavTour && tourPhase === 'scroll' && (
              <p className="text-center text-[10px] sm:text-xs text-white font-medium mt-2 animate-tour-labels-in">
                Swipe or scroll to see all questions →
              </p>
            )}
          </div>

          {/* ── Tour dimming overlay ── */}
          {showNavTour && (
            <div
              className="fixed inset-0 bg-black/40 z-[60] transition-opacity duration-500"
              onClick={dismissTour}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-6 md:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto w-full">

          {/* Question Card */}
          <div className="mx-auto w-full max-w-4xl">
            <div className={`bg-white rounded-2xl shadow-lg p-6 md:p-10 space-y-8 ${
              currentQuestion.question_type === 'rank' ? '' : 'card-hover'
            }`}>
              {/* Question Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[#008489] font-semibold text-s tracking-wide uppercase">
                    {currentCategory.category_text}
                  </span>
                  <span className="text-s text-[#4A4A4A] bg-gray-100 px-3 py-1 rounded-full">
                    {getQuestionTypeLabel(currentQuestion.question_type)}
                  </span>
                </div>
                <h2 className="text-2xl md:text-xl text-[#002D72] leading-relaxed">
                  {currentQuestion.question_text}
                </h2>
              </div>

              {/* Question Input */}
              <div className="min-h-[0px]">
                <QuestionRenderer
                  question={currentQuestion}
                  value={currentResponse}
                  onChange={handleResponseChange}
                />
              </div>



              {/* Navigation */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {unansweredCount === 0 && (
                    <Button
                      onClick={() => {
                        const ans = responses[responseKey];
                        if (ans !== undefined && ans !== null) {
                          saveAnswerToDB(currentQuestion.main_question_id, ans);
                        }
                        setSubmitConfirmOpen(true);
                      }}
                      disabled={submitting}
                      className="gap-2 bg-[#008489] hover:bg-[#006f74]"
                    >
                      {submitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Submit</>
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    disabled={!canGoNext || submitting}
                    className="gap-2 bg-[#002D72] hover:bg-[#001f52]"
                  >
                    {isLastQuestion ? "Complete" : "Next"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* ── Rank order confirmation dialog ── */}
      <AlertDialog open={rankConfirmOpen} onOpenChange={setRankConfirmOpen}>
        <AlertDialogContent className="rounded-2xl shadow-xl border-0 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#002D72] text-lg font-semibold">
              Keep the default order?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#4A4A4A] leading-relaxed">
              You haven't changed the ranking order. The items will be submitted in the default order shown.
              <br /><br />
              If this reflects your priorities, click <strong>Proceed</strong>. Otherwise click <strong>Go Back</strong> to rearrange.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-200 text-[#4A4A4A] hover:bg-gray-50">
              Go Back
            </AlertDialogCancel>
            {/* Skip — remove the auto-recorded default and move forward unanswered */}
            <Button
              variant="outline"
              onClick={() => {
                setRankConfirmOpen(false);
                // Remove the optimistically-saved default order so question stays unanswered
                setResponses((prev) => {
                  const updated = { ...prev };
                  delete updated[responseKey];
                  return updated;
                });
                if (isLastQuestion) {
                  // unansweredCount won't update synchronously, so assume at least this one
                  setCompletionDialogOpen(true);
                } else {
                  doNavigateNext();
                }
              }}
              className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              Skip for now
            </Button>
            <AlertDialogAction
              onClick={() => {
                setRankConfirmOpen(false);
                if (isLastQuestion) {
                  if (unansweredCount > 0) {
                    setCompletionDialogOpen(true);
                  } else {
                    setSubmitConfirmOpen(true);
                  }
                } else {
                  doNavigateNext();
                }
              }}
              className="rounded-xl bg-[#002D72] hover:bg-[#001f52] text-white"
            >
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Completion check dialog (unanswered questions) ── */}
      <AlertDialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
        <AlertDialogContent className="rounded-2xl shadow-xl border-0 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#002D72] text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              {unansweredCount} Question{unansweredCount !== 1 ? "s" : ""} Not Answered
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#4A4A4A] leading-relaxed">
              You still have unanswered questions. Click a question below to answer it.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Unanswered question list */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {unansweredQuestions.map((q) => {
              const catName = surveyData.find((c) =>
                c.questions.some((cq) => cq.main_question_id === q.main_question_id)
              )?.category_text ?? "";
              return (
                <button
                  key={q.main_question_id}
                  type="button"
                  onClick={() => navigateToQuestion(q)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-[#008489] hover:bg-[#008489]/5 transition-all duration-200 group"
                >
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#008489] font-medium mb-0.5 uppercase tracking-wide">{catName}</p>
                    <p className="text-sm text-[#002D72] leading-snug line-clamp-2">{q.question_text}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#008489] flex-shrink-0 mt-1 transition-colors" />
                </button>
              );
            })}
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-200 text-[#4A4A4A] hover:bg-gray-50">
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Submit confirmation dialog ── */}
      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent className="rounded-2xl shadow-xl border-0 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#002D72] text-lg font-semibold">
              Submit Assessment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#4A4A4A] leading-relaxed">
              You have answered all questions. Once submitted your responses cannot be changed.
              <br /><br />
              Click <strong>Submit</strong> to finalise, or <strong>Go Back</strong> to review your answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-200 text-[#4A4A4A] hover:bg-gray-50">
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSubmitConfirmOpen(false);
                handleSubmit();
              }}
              disabled={submitting}
              className="rounded-xl bg-[#002D72] hover:bg-[#001f52] text-white"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</>
              ) : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Premium Thank-You Screen ──
function ThankYouScreen() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#f0f4ff] via-white to-[#e8f5f5]">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Confetti particles */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              background: ["#002D72", "#008489", "#4CAF50", "#FFB300", "#E91E63"][
                Math.floor(Math.random() * 5)
              ],
              left: `${Math.random() * 100}%`,
              top: "-5%",
              opacity: 0.6,
              animation: `confettiFall ${5 + Math.random() * 8}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div
          className="w-full max-w-2xl"
          style={{ animation: "scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
        >
          {/* Card */}
          <div className="bg-white/80 rounded-3xl shadow-xl  p-8 md:p-14 text-center relative overflow-hidden gradient-border-hover">

            {/* Logo */}
            <div
              className="flex justify-center mb-8"
              style={{ animation: "fadeSlideUp 0.6s ease-out 0.2s both" }}
            >
              <img
                src={logo}
                alt="HARTS Consulting"
                className="h-14 w-auto drop-shadow-sm"
              />
            </div>

            {/* Heading */}
            <div style={{ animation: "fadeSlideUp 0.6s ease-out 0.6s both" }}>
              <h1 className="text-4xl md:text-5xl leading-tight font-light text-[#002D72] mb-3 tracking-tight">
                Thank You
              </h1>
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#008489]" />
                <Heart className="w-5 h-5 fill-[#008489] stroke-[#008489] hover:scale-110"/>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#008489]" />
              </div>
            </div>

            {/* Message */}
            <div style={{ animation: "fadeSlideUp 0.6s ease-out 0.8s both" }}>
              <p className="text-lg text-[#4A4A4A] leading-relaxed mb-2 max-w-md mx-auto">
                Your assessment has been submitted successfully.
              </p>
              <p className="mb-6 text-sm text-[#4A4A4A]/70 leading-relaxed max-w-sm mx-auto">
                We appreciate your valuable input. Your responses will help drive
                meaningful organizational insights.
              </p>
            </div>

          </div>

          {/* Bottom branding */}
          <div
            className="text-center mt-8"
            style={{ animation: "fadeSlideUp 0.6s ease-out 1.3s both" }}
          >
            <p className="text-xs text-[#4A4A4A]/40 tracking-widest uppercase">
              Powered by HARTS Consulting
            </p>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes floatOrb {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.2; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.7; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes scaleIn {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shineSweep {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
