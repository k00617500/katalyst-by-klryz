"use client";

import { useEffect, useState } from "react";
import { MAX_RATING } from "@/data/vibe-check";
import { overallReviewFromScore } from "@/lib/vibe-poster";

interface Summary {
  total: number;
  averageRating: number;
  averageScore: number;
  reviews: Record<string, number>;
  moods: Array<{ label: string; tone: "positive" | "negative"; count: number; average: number }>;
}

const REVIEW_ORDER = ["Overwhelmingly positive", "Positive", "Mixed feelings", "Leaning negative", "Negative"];
const TOP_MOODS = 8;

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 text-left sm:p-5">
      <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 text-xl leading-tight font-medium tracking-tight text-balance break-words sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Bar({ label, value, max, display, tone, note }: { label: string; value: number; max: number; display: string; tone: "positive" | "negative" | "neutral"; note?: string }) {
  const width = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <li className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_auto]">
      <span className="truncate text-left">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className={`block h-full rounded-full transition-[width] duration-700 ${tone === "positive" ? "bg-brand" : tone === "negative" ? "bg-foreground/40" : "bg-brand-ink/60"}`} style={{ width: `${width}%` }} />
      </span>
      <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">{display}{note ? ` \u00b7 ${note}` : ""}</span>
    </li>
  );
}

/** Consolidated results from every finished Vibe Check, refreshed after each new submission. */
export function VibeKpis({ refreshKey }: { refreshKey: number }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/vibe-results", { cache: "no-store" });
        const data = response.ok ? await response.json() : null;
        if (!cancelled) setSummary(data?.summary ?? null);
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const hasData = !!summary && summary.total > 0;
  const topMoods = summary?.moods.slice(0, TOP_MOODS) ?? [];
  const maxMood = topMoods[0]?.count ?? 0;
  const maxReview = Math.max(0, ...REVIEW_ORDER.map((review) => summary?.reviews[review] ?? 0));
  const positiveShare = hasData
    ? Math.round((((summary.reviews["Overwhelmingly positive"] ?? 0) + (summary.reviews["Positive"] ?? 0)) / summary.total) * 100)
    : 0;

  return (
    <div className="mx-auto mt-12 max-w-4xl text-left" aria-label="Vibe check results so far">
      <div className="text-center">
        <span className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">The vibe so far</span>
        <h3 className="mx-auto mt-3 max-w-xl text-balance text-2xl font-medium tracking-tight sm:text-3xl">What everyone&apos;s feeling in here</h3>
      </div>

      {!loaded ? (
        <p className="mt-8 text-center text-muted-foreground" role="status">Reading the room&hellip;</p>
      ) : !hasData ? (
        <p className="mt-8 text-center text-muted-foreground">No vibes logged yet. Finish a vibe check and you&apos;ll be the first on the board.</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Vibe checks" value={summary.total.toLocaleString()} hint="finished by visitors" />
            <Kpi label="Overall review" value={overallReviewFromScore(summary.averageScore)} hint="across every result" />
            <Kpi label="Positive vibes" value={`${positiveShare}%`} hint="of all vibe checks" />
            <Kpi label="Avg. intensity" value={`${summary.averageRating.toFixed(1)} / ${MAX_RATING}`} hint="how strongly moods land" />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-label="Most picked moods">
              <h4 className="font-medium">The moods</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">Most picked, with how strongly they were felt.</p>
              <ul className="mt-5 flex flex-col gap-3">
                {topMoods.map((mood) => (
                  <Bar key={mood.label} label={mood.label} value={mood.count} max={maxMood} display={`${mood.count}`} tone={mood.tone} note={`${mood.average.toFixed(1)}/${MAX_RATING}`} />
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-label="Overall review spread">
              <h4 className="font-medium">The overall review</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">How the consolidated results add up.</p>
              <ul className="mt-5 flex flex-col gap-3">
                {REVIEW_ORDER.map((review) => (
                  <Bar key={review} label={review} value={summary.reviews[review] ?? 0} max={maxReview} display={`${summary.reviews[review] ?? 0}`}
                    tone={review.includes("positive") || review === "Positive" ? "positive" : review === "Mixed feelings" ? "neutral" : "negative"} />
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
