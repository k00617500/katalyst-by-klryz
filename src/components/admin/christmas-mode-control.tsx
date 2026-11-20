"use client";

import { useState, useTransition } from "react";
import { Loader2, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setChristmasModeAction } from "@/app/admin/(dashboard)/settings/actions";

type Mode = "auto" | "on" | "off";

const OPTIONS: { value: Mode; label: string; hint: string }[] = [
  { value: "auto", label: "Automatic", hint: "On from December 1 to January 6, off the rest of the year." },
  { value: "on", label: "Turn on now", hint: "Christmas pinball and snowfall show on the site right away." },
  { value: "off", label: "Turn off", hint: "The regular site, even in December." },
];

export function ChristmasModeControl({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const choose = (next: Mode) => {
    if (next === mode || pending) return;
    const previous = mode;
    setMode(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setChristmasModeAction(next);
      if (result.error) { setMode(previous); setError(result.error); } else setSaved(true);
    });
  };

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Snowflake className="size-4" aria-hidden="true" />
        Red-and-white Christmas pinball table and a light snowfall. Changes reach visitors within about a minute.
      </p>
      <div role="radiogroup" aria-label="Christmas mode" className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={mode === option.value}
            variant={mode === option.value ? "default" : "outline"}
            disabled={pending}
            onClick={() => choose(option.value)}
            className="h-auto flex-col items-start gap-1 whitespace-normal px-3 py-2.5 text-left"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {pending && mode === option.value && <Loader2 className="size-3.5 animate-spin" />}
              {option.label}
            </span>
            <span className="text-xs font-normal opacity-75">{option.hint}</span>
          </Button>
        ))}
      </div>
      {saved && <p className="text-sm text-brand-ink">Saved.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
