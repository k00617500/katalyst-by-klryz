"use client";

import { useState } from "react";
import { AnalyticsChart } from "@/components/admin/analytics-chart";

export function TrafficChart({ daily }: { daily: { date: string; views: number; visitors: number }[] }) {
  const [metric, setMetric] = useState<"views" | "visitors">("views");

  const data = daily.map((d) => ({ label: d.date.slice(5), value: d[metric] }));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(["views", "visitors"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              metric === m
                ? "border-brand/30 bg-brand/10 text-brand-ink"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {m === "views" ? "Page views" : "Visitors"}
          </button>
        ))}
      </div>
      <AnalyticsChart
        title="Daily traffic"
        data={data}
        defaultType="line"
        valueLabel={metric === "views" ? "views" : "visitors"}
      />
    </div>
  );
}
