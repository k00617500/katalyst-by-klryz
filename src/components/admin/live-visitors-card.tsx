"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

export function LiveVisitorsCard({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/admin/live-visitors", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(data.count);
      } catch {
        // Network hiccup — keep showing the last known count.
      }
    }

    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Live now</p>
        <Radio className={`size-4 ${count > 0 ? "text-brand-ink" : "text-muted-foreground"}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{count}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">active in the last 5 min · updates every 15s</p>
    </div>
  );
}
