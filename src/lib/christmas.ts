/**
 * Christmas season. The admin sets a mode in Settings:
 *   auto - on from December 1 to January 6 (the visitor's local date)
 *   on   - always on
 *   off  - always off
 * Add `?xmas=on` or `?xmas=off` to any URL to preview or hide it for that tab (overrides the admin mode).
 */
export type ChristmasMode = "auto" | "on" | "off";

const OVERRIDE_KEY = "katalyst-xmas";

function inSeason(now: Date) {
  const month = now.getMonth();
  return month === 11 || (month === 0 && now.getDate() <= 6);
}

/** Pure: does this mode mean "show Christmas" right now? */
export function christmasFor(mode: ChristmasMode, now = new Date()): boolean {
  return mode === "on" || (mode === "auto" && inSeason(now));
}

/** The tab-level `?xmas=` preview override, if any. Client only. */
function previewOverride(): "on" | "off" | null {
  if (typeof window === "undefined") return null;
  try {
    const param = new URLSearchParams(window.location.search).get("xmas");
    if (param === "on" || param === "off") window.sessionStorage.setItem(OVERRIDE_KEY, param);
    const stored = window.sessionStorage.getItem(OVERRIDE_KEY);
    return stored === "on" || stored === "off" ? stored : null;
  } catch {
    return null;
  }
}

let modePromise: Promise<ChristmasMode> | null = null;

/** The admin's mode, fetched once per page load; falls back to "auto" if the request fails. */
function fetchMode(): Promise<ChristmasMode> {
  // Inside the admin's preview frame, skip the 30-second cache so a change shows straight away.
  const bust = window.self !== window.top ? `?t=${Date.now()}` : "";
  modePromise ??= fetch("/api/site-settings" + bust, bust ? { cache: "no-store" } : undefined)
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { christmas?: string } | null) => (data?.christmas === "on" || data?.christmas === "off" ? data.christmas : "auto"))
    .catch(() => "auto" as const);
  return modePromise;
}

/** Client only: should Christmas be showing for this visitor right now? */
export async function resolveChristmas(): Promise<boolean> {
  const override = previewOverride();
  if (override) return override === "on";
  return christmasFor(await fetchMode());
}
