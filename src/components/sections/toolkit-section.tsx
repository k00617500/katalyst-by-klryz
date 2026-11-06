"use client";

import type { CSSProperties } from "react";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { toolkitItems } from "@/data/toolkit";

export function ToolkitSection() {
  return (
    <section className="container-page section-y border-t border-border/60">
      <ScrollReveal>
        <SectionHeading
          eyebrow="Stack"
          title="The Katalyst Toolkit"
          description="The languages, frameworks, and tools I reach for most. Hover to see them come alive."
          className="mb-14"
        />
      </ScrollReveal>

      <ScrollReveal
        y={0}
        className="toolkit-grid flex flex-wrap overflow-hidden rounded-lg border-t border-l border-border"
      >
        {toolkitItems.map((item) => {
          const Icon = item.icon;
          const isAdaptive = item.color === "adaptive";
          return (
            <div
              key={item.name}
              className="toolkit-tile group relative flex min-w-0 flex-col items-center justify-center gap-3 border-r border-b border-border bg-background px-2 py-7"
              style={{ "--tool-color": isAdaptive ? "var(--foreground)" : item.color } as CSSProperties}
            >
              <Icon
                className="size-8 text-muted-foreground/60 grayscale transition-all duration-300 md:size-9"
              />
              <span className="font-space text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                {item.name}
              </span>
            </div>
          );
        })}
      </ScrollReveal>
    </section>
  );
}
