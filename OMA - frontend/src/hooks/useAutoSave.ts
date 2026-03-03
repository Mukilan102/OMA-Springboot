import { useCallback, useEffect, useRef } from "react";
import apiClient from "../config/api";
import type { ResponseValue } from "../types/survey";

/**
 * Event-driven autosave hook.
 *
 * Core design:
 *  - Maintains a snapshot of the last *successfully* saved state.
 *  - On every trigger (navigation, answer change, visibility change, online recovery),
 *    compares current responses to the snapshot.
 *  - Only POSTs when the state has actually changed → no wasted requests when the
 *    user merely revisits already-answered questions.
 *  - Sends the FULL responses object every time → idempotent; if a previous request
 *    failed, the next success restores everything.
 *  - Never blocks navigation; failures are silently absorbed and retried on the
 *    next trigger.
 *
 * Triggers (all event-based, no polling/intervals):
 *  1. `triggerSave()`       - called by the component on navigation (next/prev/strip)
 *  2. answer change          - detected via `responses` ref diff, debounced ~3 s
 *  3. visibility change      - `visibilitychange` event (tab hide / close)
 *  4. `beforeunload`         - last-chance save via `navigator.sendBeacon`
 *  5. `online`               - network recovery after offline period
 */

const LS_RESPONSES = "oma_survey_responses";
const LS_POSITION  = "oma_survey_position";

export interface AutoSaveOptions {
  sessionId: string;
  responses: Record<string, ResponseValue>;
  currentCategoryIndex: number;
  currentQuestionIndex: number;
  /** Don't start saving until the survey is loaded and has data */
  enabled: boolean;
  /** Callback so the Survey component can reflect save status in the UI */
  onStatusChange?: (status: "idle" | "saving" | "saved" | "offline") => void;
}

export function useAutoSave({
  sessionId,
  responses,
  currentCategoryIndex,
  currentQuestionIndex,
  enabled,
  onStatusChange,
}: AutoSaveOptions) {
  // ── Refs that outlive renders ──
  const lastSavedSnapshot = useRef<string>("{}");
  const responsesRef = useRef(responses);
  const enabledRef = useRef(enabled);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving = useRef(false);

  // Keep refs current
  responsesRef.current = responses;
  enabledRef.current = enabled;

  // ── Mirror to localStorage immediately on every render (cheap, synchronous) ──
  useEffect(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(LS_RESPONSES, JSON.stringify(responses));
      localStorage.setItem(
        LS_POSITION,
        JSON.stringify({ categoryIndex: currentCategoryIndex, questionIndex: currentQuestionIndex })
      );
    } catch {
      // localStorage full or unavailable - silently ignore
    }
  }, [responses, currentCategoryIndex, currentQuestionIndex, enabled]);

  // ── Core save function ──
  const doSave = useCallback(
    async (beacon = false) => {
      if (!enabledRef.current) return;

      const current = JSON.stringify(responsesRef.current);

      // Nothing changed since last successful save → skip
      if (current === lastSavedSnapshot.current) return;

      if (!navigator.onLine) {
        onStatusChange?.("offline");
        return;
      }

      // For page unload, use sendBeacon (fire-and-forget, can't await)
      if (beacon) {
        const consentAt = sessionStorage.getItem("gdpr_consent_at") ?? undefined;
        const payload = JSON.stringify({
          sessionId,
          responses: responsesRef.current,
          consentGiven: !!consentAt,
          consentAt,
        });
        const blob = new Blob([payload], { type: "application/json" });
        const sent = navigator.sendBeacon(
          `${apiClient.baseUrl}/survey/save-progress`,
          blob
        );
        if (sent) lastSavedSnapshot.current = current;
        return;
      }

      // Normal fetch-based save
      if (isSaving.current) return; // de-dup concurrent calls
      isSaving.current = true;
      onStatusChange?.("saving");

      try {
        const consentAt = sessionStorage.getItem("gdpr_consent_at") ?? undefined;
        const res = await apiClient.fetch("/survey/save-progress", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            responses: responsesRef.current,
            consentGiven: !!consentAt,
            consentAt,
          }),
        });
        if (res.ok) {
          // Snapshot what we successfully saved
          lastSavedSnapshot.current = JSON.stringify(responsesRef.current);
          onStatusChange?.("saved");
          // Auto-clear "saved" badge after 1.5 s
          if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current);
          savedIndicatorTimer.current = setTimeout(() => onStatusChange?.("idle"), 1500);
        } else {
          // Server error → keep local data, will retry on next trigger
          onStatusChange?.("idle");
        }
      } catch {
        // Network error → keep local data, will retry on next trigger
        if (!navigator.onLine) {
          onStatusChange?.("offline");
        } else {
          onStatusChange?.("idle");
        }
      } finally {
        isSaving.current = false;
      }
    },
    [sessionId, onStatusChange]
  );

  // ── 1. Imperative trigger - called by Survey on navigation (next / prev / strip) ──
  const triggerSave = useCallback(() => {
    // Cancel any pending debounce so we don't double-save
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    doSave();
  }, [doSave]);

  // ── 2. Answer-change detection (debounced 3 s) ──
  useEffect(() => {
    if (!enabled) return;

    const current = JSON.stringify(responses);
    if (current === lastSavedSnapshot.current) return; // no change

    // Debounce: wait 3 s of inactivity before saving
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      doSave();
    }, 3000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [responses, enabled, doSave]);

  // ── 3. Visibility change (tab switch / minimize) ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Tab is being hidden - try beacon for reliability
        doSave(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [doSave]);

  // ── 4. Before unload - absolute last chance ──
  useEffect(() => {
    const handleUnload = () => {
      doSave(true);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [doSave]);

  // ── 5. Online recovery - flush if we went offline and came back ──
  useEffect(() => {
    const handleOnline = () => {
      onStatusChange?.("idle");
      doSave();
    };
    const handleOffline = () => {
      onStatusChange?.("offline");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [doSave, onStatusChange]);

  // ── Seed snapshot when initial data loads from DB / localStorage ──
  const seedSnapshot = useCallback((data: Record<string, ResponseValue>) => {
    lastSavedSnapshot.current = JSON.stringify(data);
  }, []);

  return { triggerSave, seedSnapshot };
}
