"use client";

import { ArrowDown } from "lucide-react";

/** A small down arrow that glides to the next section of the page. */
export function ScrollDown({ target, label }: { target: string; label: string }) {
  return (
    <div className="flex justify-center py-6">
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          document.getElementById(target)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        }}
        className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground backdrop-blur transition-colors hover:border-brand-ink hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
      >
        <ArrowDown className="size-4 motion-safe:animate-bounce" aria-hidden="true" />
      </button>
    </div>
  );
}
