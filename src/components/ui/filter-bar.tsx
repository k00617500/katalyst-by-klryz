"use client";

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterBarProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

function pillClasses(active: boolean) {
  return cn(
    "shrink-0 whitespace-nowrap rounded-md border px-2.5 py-2 font-mono text-xs tracking-wide uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-ink",
    active
      ? "brand-surface border-transparent text-brand-foreground"
      : "border-border bg-transparent text-muted-foreground hover:border-brand-ink hover:text-foreground",
  );
}

export function FilterBar<T extends string>({ label, options, value, onChange }: FilterBarProps<T>) {
  const [primary, ...rest] = options;
  const isPrimaryActive = value === primary.value;

  return (
    <div role="group" aria-label={label} className="min-w-0 flex-1">
      {/* Tablet/desktop: every category as its own pill in a scrollable row. */}
      <div className="hidden min-w-0 flex-nowrap gap-1.5 overflow-x-auto py-1 sm:flex">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={pillClasses(value === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Mobile: "All" plus a dropdown trigger (defaulting to the next category) for the rest. */}
      <div className="flex min-w-0 gap-1.5 py-1 sm:hidden">
        <button
          type="button"
          aria-pressed={isPrimaryActive}
          onClick={() => onChange(primary.value)}
          className={pillClasses(isPrimaryActive)}
        >
          {primary.label}
        </button>

        <Select value={isPrimaryActive ? undefined : value} onValueChange={(next) => onChange(next as T)}>
          <SelectTrigger
            className={cn(
              "h-auto min-w-0 flex-1 justify-between rounded-md border px-2.5 py-2 font-mono text-xs tracking-wide uppercase",
              isPrimaryActive
                ? "border-border bg-transparent text-muted-foreground hover:border-brand-ink hover:text-foreground"
                : "brand-surface border-transparent text-brand-foreground",
            )}
          >
            <SelectValue placeholder={rest[0]?.label} />
          </SelectTrigger>
          <SelectContent>
            {rest.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
