/**
 * The site's Christmas season: December 1 through January 6 (the visitor's local date).
 * Add `?xmas=on` or `?xmas=off` to any URL to preview or hide it; the choice is remembered for the tab.
 */
const OVERRIDE_KEY = "katalyst-xmas";

function inSeason(now: Date) {
  const month = now.getMonth();
  return month === 11 || (month === 0 && now.getDate() <= 6);
}

/** Client only. */
export function isChristmasActive(now = new Date()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const param = new URLSearchParams(window.location.search).get("xmas");
    if (param === "on" || param === "off") window.sessionStorage.setItem(OVERRIDE_KEY, param);
    const override = window.sessionStorage.getItem(OVERRIDE_KEY);
    if (override === "on") return true;
    if (override === "off") return false;
  } catch { /* storage can be unavailable */ }
  return inSeason(now);
}
