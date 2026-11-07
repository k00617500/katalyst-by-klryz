"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CONTROLS: Array<{ keys: string; action: string }> = [
  { keys: "A / ←", action: "Left flipper" },
  { keys: "D / →", action: "Right flipper" },
  { keys: "Space / S / ↓", action: "Hold to charge the plunger, release to launch" },
  { keys: "Z / C / X", action: "Nudge left, right, or up" },
  { keys: "Esc", action: "Pause / resume" },
];

export function PinballInstructionsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border border-border ring-0 shadow-none sm:max-w-[38rem] sm:p-6">
        <DialogHeader>
          <DialogTitle>How to play</DialogTitle>
          <DialogDescription>Three balls per run. The table tops out at 100,000 points.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {CONTROLS.map((row) => (
            <div key={row.keys} className="flex items-center justify-between gap-3 rounded-md bg-secondary/40 px-2.5 py-1.5 text-xs">
              <span className="shrink-0 font-mono text-foreground">{row.keys}</span>
              <span className="text-right text-muted-foreground">{row.action}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <p><strong className="text-foreground">Plunger tip.</strong> Tap for a lighter shot, or hold to build up to full power. Release at the strength you want.</p>
          <p>Nudge to shake a ball loose. Nudging too often tilts the table.</p>
          <p>Bumpers, slingshots, ramps and targets earn points. Chain hits to build a combo.</p>
          <p>Light all five targets twice, then hit the center bumper for the jackpot.</p>
          <p>The third drain saves your score. You can play again immediately.</p>
          <p>Restart within the first minute to reset the table after a 30-second wait.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
