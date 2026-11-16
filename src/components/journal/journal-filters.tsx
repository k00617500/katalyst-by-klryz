"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "@/types/database";

export function JournalFilters({
  categories,
  initial,
}: {
  categories: CategoryRow[];
  initial: { category?: string; search?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(initial.search ?? "");

  function navigate(next: { category?: string; search?: string }) {
    const params = new URLSearchParams();
    if (next.category) params.set("category", next.category);
    if (next.search) params.set("search", next.search);
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate({ search: initial.search })}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            !initial.category ? "border-brand bg-brand/10 text-brand-ink" : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => navigate({ category: category.slug, search: initial.search })}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              initial.category === category.slug
                ? "border-brand bg-brand/10 text-brand-ink"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ category: initial.category, search });
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles..."
          className="h-9 w-56 rounded-full border border-border bg-transparent pl-9 pr-3 text-sm outline-none focus:border-brand"
        />
      </form>
    </div>
  );
}
