import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MAX_MOODS, MIN_MOODS, MOOD_OPTIONS } from "@/data/vibe-check";
import { overallReview } from "@/lib/vibe-poster";

// Consolidated, anonymous Vibe Check results. POST stores one finished check (moods + ratings only);
// GET returns aggregates for the KPI graphs. Rows themselves can never be read back by visitors.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) for (const [key, times] of hits) if (!times.some((time) => now - time < WINDOW_MS)) hits.delete(key);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "Too many submissions" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const submitted: unknown = body?.moods;
  if (!Array.isArray(submitted) || submitted.length < MIN_MOODS || submitted.length > MAX_MOODS) {
    return NextResponse.json({ error: "Invalid moods" }, { status: 400 });
  }

  const seen = new Set<string>();
  const moods: Array<{ label: string; tone: "positive" | "negative"; rating: number }> = [];
  for (const entry of submitted) {
    const option = MOOD_OPTIONS.find((mood) => mood.label === entry?.label);
    const rating = Number(entry?.rating);
    if (!option || seen.has(option.label) || !Number.isInteger(rating) || rating < 1 || rating > 10) {
      return NextResponse.json({ error: "Invalid moods" }, { status: 400 });
    }
    seen.add(option.label);
    moods.push({ label: option.label, tone: option.tone, rating });
  }

  const { label, score } = overallReview(moods);
  const supabase = await createClient();
  const { error } = await supabase.from("vibe_check_results").insert({ moods, review: label, score: Number(score.toFixed(3)) });
  if (error) return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("vibe_check_summary");
    if (error) return NextResponse.json({ summary: null });
    return NextResponse.json({ summary: data }, { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ summary: null });
  }
}
