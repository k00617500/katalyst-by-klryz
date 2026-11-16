"use client";

const SESSION_KEY = "katalyst-analytics-session";

export type AnalyticsEventName =
  | "page_view"
  | "project_view"
  | "project_demo_click"
  | "project_source_click"
  | "article_view"
  | "article_share"
  | "resume_download"
  | "contact_click"
  | "email_click"
  | "social_link_click"
  | "navigation_click";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

function getDeviceCategory(): "desktop" | "mobile" | "tablet" {
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/** Fire-and-forget analytics event. Never throws, never blocks the UI it's attached to. */
export function track(eventName: AnalyticsEventName, metadata: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    eventName,
    path: window.location.pathname,
    referrer: document.referrer || null,
    deviceCategory: getDeviceCategory(),
    sessionId: getSessionId(),
    metadata,
  };

  try {
    navigator.sendBeacon?.("/api/track", JSON.stringify(payload));
  } catch {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}
