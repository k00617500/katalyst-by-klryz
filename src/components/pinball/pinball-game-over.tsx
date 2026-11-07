"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PinballHudState } from "./use-pinball-game";

function verdictFor(hud: PinballHudState): string {
  if (hud.score === 0) return "GAME OVER. THE HOUSE WINS THIS ROUND.";
  if (hud.score >= hud.highScore && hud.score > 0) return "NEW HIGH SCORE. YOU'RE THE PINBALL MACHINE NOW.";
  if (hud.score > hud.highScore * 0.7) return "ONE MORE BALL WOULD'VE CHANGED EVERYTHING.";
  return "NICE RUN. THE BUMPERS WEREN'T KIND.";
}

export function PinballGameOver({
  hud,
  open,
  onPlayAgain,
  onClose,
}: {
  hud: PinballHudState;
  open: boolean;
  onPlayAgain: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Game Over</DialogTitle>
          <DialogDescription>{verdictFor(hud)}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 font-mono text-xs">
          <div className="rounded-lg border border-border p-3">
            <p className="text-muted-foreground">Final Score</p>
            <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">{hud.score.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-muted-foreground">Best Score</p>
            <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">{hud.highScore.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-muted-foreground">Level Reached</p>
            <p className="mt-1 font-medium text-foreground">{hud.level.tierName}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-muted-foreground">Submitted</p>
            <p className="mt-1 font-medium text-foreground">{hud.submitted ? "To scoreboard" : "—"}</p>
          </div>
        </div>

        <Button type="button" className="w-full" onClick={onPlayAgain}>
          One More Game
        </Button>
      </DialogContent>
    </Dialog>
  );
}
