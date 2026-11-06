"use client";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
export type ContentView = "list" | "grid";
export function ViewToggle({ value, onChange }: { value: ContentView; onChange: (view: ContentView) => void }) {
  return <div role="group" aria-label="Content layout" className="flex shrink-0 gap-2">
    {(["list", "grid"] as const).map((view) => {
      const Icon = view === "list" ? List : LayoutGrid;
      return <button key={view} type="button" aria-label={`${view === "list" ? "List" : "Grid"} view`} aria-pressed={value === view} onClick={() => onChange(view)} className={cn("flex size-10 items-center justify-center rounded-md border border-border transition-colors focus-visible:outline-2 focus-visible:outline-brand", value === view ? "brand-surface text-brand-foreground" : "text-muted-foreground hover:text-foreground")}><Icon className="size-4" /></button>;
    })}
  </div>;
}
