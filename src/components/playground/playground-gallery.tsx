"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  playgroundCategoryLabels,
  type PlaygroundCategory,
  type PlaygroundItem,
} from "@/data/playground";

export function PlaygroundGallery({ items }: { items: PlaygroundItem[] }) {
  const [active, setActive] = useState<PlaygroundCategory | "all">("all");

  const filtered = useMemo(
    () => (active === "all" ? items : items.filter((i) => i.category === active)),
    [active, items],
  );

  const categories = Object.entries(playgroundCategoryLabels) as [
    PlaygroundCategory,
    string,
  ][];

  return (
    <div>
      <div className="mb-8 flex min-w-0">
        <FilterBar<PlaygroundCategory | "all">
          label="Playground categories"
          options={[{ value: "all", label: "All" }, ...categories.map(([value, label]) => ({ value, label }))]}
          value={active}
          onChange={setActive}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid overflow-hidden rounded-2xl border border-border"
            >
              <div className="relative aspect-auto">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={800}
                  height={600}
                  className="w-full object-cover"
                />
              </div>
              <div className="p-4">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="font-mono text-xs text-muted-foreground uppercase">
                  {playgroundCategoryLabels[item.category]}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <p>This space is being stocked with experiments.</p>
          <p className="mt-1 text-sm">Photography, design work, and prototypes coming soon.</p>
        </div>
      )}
    </div>
  );
}
