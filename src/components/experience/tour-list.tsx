"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { tourVisits } from "@/data/educational-tour";

const PAGE_SIZE = 5;

/** The companies from the educational tour, five to a page, with one insight open at a time. */
export function TourList() {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(tourVisits.length / PAGE_SIZE);
  const visits = tourVisits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const turn = (delta: number) => setPage((value) => (value + delta + pageCount) % pageCount);

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {visits.map((visit) => (
          <li key={visit.company}>
            <details name="tour-insights" className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-start gap-3">
                  <visit.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="font-medium">{visit.company}</span>
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{visit.place}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground uppercase">
                  Insights<ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                </span>
              </summary>
              <p className="max-w-2xl pb-4 text-sm leading-[1.9]"><span className="bg-brand px-1.5 py-0.5 text-black [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">{visit.insight}</span></p>
            </details>
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <nav aria-label="Companies pages" className="mt-5 flex items-center justify-center gap-2">
          <button type="button" aria-label="Previous page" onClick={() => turn(-1)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          {Array.from({ length: pageCount }, (_, index) => (
            <button key={index} type="button" aria-label={`Page ${index + 1}`} aria-current={page === index ? "page" : undefined} onClick={() => setPage(index)}
              className={`inline-flex size-9 items-center justify-center rounded-full border font-mono text-xs tabular-nums transition-colors ${
                page === index ? "border-brand bg-brand text-brand-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}>{index + 1}</button>
          ))}
          <button type="button" aria-label="Next page" onClick={() => turn(1)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
