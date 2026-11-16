import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DateRangeKey = "today" | "7d" | "30d" | "90d" | "year" | "all";

export function rangeToDates(range: DateRangeKey): { start: Date | null; previousStart: Date | null; previousEnd: Date | null } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const spans: Record<DateRangeKey, number | null> = {
    today: 1,
    "7d": 7,
    "30d": 30,
    "90d": 90,
    year: 365,
    all: null,
  };

  const days = spans[range];
  if (days === null) return { start: null, previousStart: null, previousEnd: null };

  const start = new Date(startOfToday);
  start.setDate(start.getDate() - (days - 1));

  const previousEnd = new Date(start);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - days);

  return { start, previousStart, previousEnd };
}

interface EventRow {
  event_name: string;
  path: string | null;
  referrer: string | null;
  device_category: string | null;
  session_id: string;
  created_at: string;
}

async function fetchEvents(start: Date | null, end?: Date): Promise<EventRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("analytics_events")
    .select("event_name, path, referrer, device_category, session_id, created_at")
    .order("created_at", { ascending: true })
    .limit(20000);

  if (start) query = query.gte("created_at", start.toISOString());
  if (end) query = query.lt("created_at", end.toISOString());

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

function classifyReferrer(referrer: string | null, siteUrl: string): string {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    const siteHost = new URL(siteUrl).hostname.replace(/^www\./, "");
    if (host === siteHost) return "Direct";
    if (host.includes("google.")) return "Google";
    if (host.includes("linkedin.")) return "LinkedIn";
    if (host.includes("facebook.") || host.includes("fb.com")) return "Facebook";
    if (host.includes("instagram.")) return "Instagram";
    if (host.includes("github.")) return "GitHub";
    if (host.includes("twitter.") || host === "x.com") return "X (Twitter)";
    return host;
  } catch {
    return "Direct";
  }
}

export interface TrafficOverview {
  visitors: number;
  pageViews: number;
  sessions: number;
  visitorsChangePct: number | null;
  pageViewsChangePct: number | null;
  hasComparison: boolean;
  dailySeries: { date: string; views: number; visitors: number }[];
  topPages: { path: string; views: number; visitors: number }[];
  sources: { label: string; count: number }[];
  devices: { label: string; count: number }[];
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getTrafficOverview(range: DateRangeKey): Promise<TrafficOverview> {
  const { start, previousStart, previousEnd } = rangeToDates(range);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [current, previous] = await Promise.all([
    fetchEvents(start),
    previousStart && previousEnd ? fetchEvents(previousStart, previousEnd) : Promise.resolve<EventRow[]>([]),
  ]);

  const pageViewEvents = current.filter((e) => e.event_name === "page_view");
  const visitorSet = new Set(current.map((e) => e.session_id));
  const sessionSet = new Set(current.map((e) => e.session_id));

  const prevPageViews = previous.filter((e) => e.event_name === "page_view").length;
  const prevVisitors = new Set(previous.map((e) => e.session_id)).size;

  const pageCounts = new Map<string, { views: number; visitors: Set<string> }>();
  for (const e of pageViewEvents) {
    const path = e.path ?? "/";
    const entry = pageCounts.get(path) ?? { views: 0, visitors: new Set<string>() };
    entry.views += 1;
    entry.visitors.add(e.session_id);
    pageCounts.set(path, entry);
  }

  const sourceCounts = new Map<string, number>();
  for (const e of pageViewEvents) {
    const label = classifyReferrer(e.referrer, siteUrl);
    sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1);
  }

  const deviceCounts = new Map<string, number>();
  for (const e of current) {
    const label = e.device_category ?? "Unknown";
    deviceCounts.set(label, (deviceCounts.get(label) ?? 0) + 1);
  }

  const dailyMap = new Map<string, { views: number; visitors: Set<string> }>();
  for (const e of pageViewEvents) {
    const day = e.created_at.slice(0, 10);
    const entry = dailyMap.get(day) ?? { views: 0, visitors: new Set<string>() };
    entry.views += 1;
    entry.visitors.add(e.session_id);
    dailyMap.set(day, entry);
  }

  return {
    visitors: visitorSet.size,
    pageViews: pageViewEvents.length,
    sessions: sessionSet.size,
    visitorsChangePct: previousStart ? pctChange(visitorSet.size, prevVisitors) : null,
    pageViewsChangePct: previousStart ? pctChange(pageViewEvents.length, prevPageViews) : null,
    hasComparison: Boolean(previousStart) && previous.length > 0,
    dailySeries: Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, views: v.views, visitors: v.visitors.size })),
    topPages: Array.from(pageCounts.entries())
      .map(([path, v]) => ({ path, views: v.views, visitors: v.visitors.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10),
    sources: Array.from(sourceCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    devices: Array.from(deviceCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Distinct sessions with any event in the last 5 minutes — a live-visitor proxy, not a websocket presence feed. */
export async function getLiveVisitorCount(): Promise<number> {
  const supabase = await createClient();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("analytics_events")
    .select("session_id")
    .gte("created_at", fiveMinutesAgo);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.session_id)).size;
}

export interface InteractionSummary {
  eventName: string;
  total: number;
  uniqueSessions: number;
}

const TRACKED_INTERACTIONS = [
  "project_view",
  "project_demo_click",
  "project_source_click",
  "article_view",
  "article_share",
  "resume_download",
  "contact_click",
  "email_click",
  "social_link_click",
  "navigation_click",
];

export async function getInteractionSummary(range: DateRangeKey): Promise<InteractionSummary[]> {
  const { start } = rangeToDates(range);
  const events = await fetchEvents(start);

  const counts = new Map<string, { total: number; sessions: Set<string> }>();
  for (const e of events) {
    if (!TRACKED_INTERACTIONS.includes(e.event_name)) continue;
    const entry = counts.get(e.event_name) ?? { total: 0, sessions: new Set<string>() };
    entry.total += 1;
    entry.sessions.add(e.session_id);
    counts.set(e.event_name, entry);
  }

  return TRACKED_INTERACTIONS.map((eventName) => ({
    eventName,
    total: counts.get(eventName)?.total ?? 0,
    uniqueSessions: counts.get(eventName)?.sessions.size ?? 0,
  })).filter((row) => row.total > 0);
}
