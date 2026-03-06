/**
 * GDPR / Privacy configuration.
 * All user-facing text is centralised here so it can be overridden via
 * VITE_ environment variables without touching component code.
 */

/* ── Paths ────────────────────────────────────────────────── */
export const PRIVACY_POLICY_PATH = "/privacy-policy";
export const TERMS_OF_SERVICE_PATH = "/terms-of-service";

/* ── Configurable copy ────────────────────────────────────── */
export const CONSENT_LABEL =
  import.meta.env.VITE_GDPR_CONSENT_LABEL ??
  "I confirm that I have read and agree to the Privacy Policy and Terms of Service, and I consent to the processing of my responses for organisational assessment purposes.";

export const PRIVACY_NOTICE_SHORT =
  import.meta.env.VITE_GDPR_PRIVACY_NOTICE ??
  "Your responses are anonymous and processed solely to evaluate organisational maturity. No personal data is collected unless you voluntarily provide it.";

export const DATA_CONTROLLER_NAME =
  import.meta.env.VITE_GDPR_DATA_CONTROLLER ?? "HARTS Consulting";

export const DATA_CONTROLLER_EMAIL =
  import.meta.env.VITE_GDPR_CONTACT_EMAIL ?? "privacy@hartsconsulting.com";

export const DATA_CONTROLLER_FULL_NAME =
  import.meta.env.VITE_GDPR_DATA_CONTROLLER_FULL ??
  "HARTS Consulting Pvt Ltd";

export const DATA_CONTROLLER_ADDRESS =
  import.meta.env.VITE_GDPR_DATA_CONTROLLER_ADDRESS ??
  "[Insert full registered address]";

export const DATA_CONTROLLER_COUNTRY =
  import.meta.env.VITE_GDPR_DATA_CONTROLLER_COUNTRY ??
  "[Insert country of incorporation]";

export const AWS_HOSTING_REGION =
  import.meta.env.VITE_GDPR_AWS_REGION ?? "[Insert AWS region]";

export const GOVERNING_LAW_COUNTRY =
  import.meta.env.VITE_GDPR_GOVERNING_LAW ?? "[Insert country]";
