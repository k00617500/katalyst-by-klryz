"use client";

import { cn } from "@/lib/utils";

interface FilterBarProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterBar<T extends string>({ label, options, value, onChange }: FilterBarProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-1 flex-nowrap gap-1.5 overflow-x-auto py-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md border px-2.5 py-2 font-mono text-xs tracking-wide uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-ink",
            value === option.value
              ? "brand-surface border-transparent text-brand-foreground"
              : "border-border bg-transparent text-muted-foreground hover:border-brand-ink hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
