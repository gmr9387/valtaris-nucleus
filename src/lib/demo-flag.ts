/**
 * Demo mode toggles whether the app adjudicates against canned demo
 * contract/plan/prior-outcome data (safe to explore with no real payer
 * or member data configured) or attempts to use real, uploaded data.
 * Persisted per-browser via localStorage; falls back to an env default
 * for SSR / first render before localStorage is available.
 */
const STORAGE_KEY = "valtaris.demoMode";

export function isDemoModeEnabled(): boolean {
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
  }
  const envDefault =
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_DEMO_MODE : undefined;
  return envDefault === "true";
}

export function setDemoModeEnabled(enabled: boolean): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  }
}
