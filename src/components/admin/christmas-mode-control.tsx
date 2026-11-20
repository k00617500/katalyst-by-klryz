"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, Loader2, RefreshCw, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { christmasFor } from "@/lib/christmas";
import { setChristmasModeAction } from "@/app/admin/(dashboard)/settings/actions";

type Mode = "auto" | "on" | "off";
type PreviewAs = "live" | "xmas" | "regular";

const OPTIONS: { value: Mode; label: string; hint: string }[] = [
  { value: "auto", label: "Automatic", hint: "On from December 1 to January 6, off the rest of the year." },
  { value: "on", label: "Turn on now", hint: "Christmas pinball and snowfall show on the site right away." },
  { value: "off", label: "Turn off", hint: "The regular site, even in December." },
];

const PREVIEWS: { value: PreviewAs; label: string; src: string }[] = [
  { value: "live", label: "As visitors see it now", src: "/" },
  { value: "xmas", label: "Christmas", src: "/?xmas=on" },
  { value: "regular", label: "Regular", src: "/?xmas=off" },
];

const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 760;

export function ChristmasModeControl({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [previewAs, setPreviewAs] = useState<PreviewAs>("live");
  const [reloads, setReloads] = useState(0);
  const [scale, setScale] = useState(0.5);
  const frameBox = useRef<HTMLDivElement>(null);

  // Scale the 1280px-wide desktop page down to fit the preview box.
  useEffect(() => {
    const box = frameBox.current;
    if (!box) return;
    const fit = () => setScale(box.clientWidth / FRAME_WIDTH);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const choose = (next: Mode) => {
    if (next === mode || pending) return;
    const previous = mode;
    setMode(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setChristmasModeAction(next);
      if (result.error) { setMode(previous); setError(result.error); }
      else { setSaved(true); setReloads((count) => count + 1); }
    });
  };

  const showingChristmas = christmasFor(mode);
  const preview = PREVIEWS.find((item) => item.value === previewAs)!;

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Snowflake className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
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

      <p className="text-sm" aria-live="polite">
        <span className="text-muted-foreground">Visitors see today: </span>
        <span className="font-medium text-foreground">{showingChristmas ? "the Christmas site" : "the regular site"}</span>
        {saved && <span className="ml-2 text-brand-ink">Saved.</span>}
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">Preview site</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Preview as" className="inline-flex gap-1 rounded-full bg-secondary p-0.5 text-xs">
              {PREVIEWS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={previewAs === item.value}
                  onClick={() => { setPreviewAs(item.value); setReloads((count) => count + 1); }}
                  className="rounded-full px-2.5 py-1 text-muted-foreground transition-colors aria-pressed:bg-background aria-pressed:text-foreground"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setReloads((count) => count + 1)}>
              <RefreshCw className="size-3.5" /> Reload
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={preview.src} target="_blank" rel="noreferrer">
                Open <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>
        </div>
        <div ref={frameBox} className="relative w-full overflow-hidden rounded-lg border border-border bg-black" style={{ height: FRAME_HEIGHT * scale }}>
          <iframe
            key={`${previewAs}-${reloads}`}
            src={preview.src}
            title="Site preview"
            className="absolute top-0 left-0 origin-top-left border-0"
            style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, transform: `scale(${scale})` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          “As visitors see it now” follows the saved setting. Use Christmas or Regular to compare without changing the live site.
        </p>
      </div>
    </div>
  );
}
