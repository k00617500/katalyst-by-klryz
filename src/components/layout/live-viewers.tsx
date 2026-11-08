"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const visitorStorageKey = "katalyst-live-visitor";
const countFormatter = new Intl.NumberFormat("en", { notation: "compact" });
let channelRemoval: Promise<unknown> = Promise.resolve();

function getVisitorKey() {
  const id = crypto.getRandomValues(new Uint32Array(4)).join("-");
  try {
    const saved = localStorage.getItem(visitorStorageKey);
    if (saved) return saved;
    localStorage.setItem(visitorStorageKey, id);
  } catch {
    // A browser that blocks storage can still count this tab for its lifetime.
  }
  return id;
}

export function LiveViewers() {
  const [presence, setPresence] = useState<number | "connecting" | "unavailable">(
    supabase ? "connecting" : "unavailable",
  );

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let active = true;
    let channel: RealtimeChannel | undefined;
    const showUnavailable = () => {
      if (active) setPresence("unavailable");
    };

    // The client reuses channels by topic. Wait for teardown before rejoining.
    void channelRemoval.then(() => {
      if (!active) return;
      const visitorKey = getVisitorKey();
      const room = client.channel(`katalyst-live-viewers:${window.location.hostname}`, {
        config: { presence: { key: visitorKey } },
      });
      channel = room;

      room
        .on("presence", { event: "sync" }, () => {
          const viewers = room.presenceState();
          if (active && Object.hasOwn(viewers, visitorKey)) {
            setPresence(Object.keys(viewers).length);
          }
        })
        .subscribe((status) => {
          if (!active) return;
          if (status === "SUBSCRIBED") {
            void room.track({ online: true }).then((result) => {
              if (result !== "ok") showUnavailable();
            }).catch(showUnavailable);
          } else {
            showUnavailable();
          }
        });
    }).catch(showUnavailable);

    return () => {
      active = false;
      if (channel) channelRemoval = client.removeChannel(channel).catch(() => undefined);
    };
  }, []);

  const isLive = typeof presence === "number";
  const spectatorLabel = presence === 1 ? "Spectator" : "Spectators";
  const label = isLive
    ? `${presence.toLocaleString("en")} ${spectatorLabel.toLowerCase()}`
    : presence === "connecting" ? "Connecting to spectator count" : "Spectator count unavailable";

  return (
    <div
      title={label}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/60 px-1.5 font-mono text-[11px] leading-none tabular-nums min-[360px]:px-2 sm:px-2.5"
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          isLive ? "bg-brand-ink shadow-[0_0_8px_var(--brand)]" : "bg-muted-foreground/55",
        )}
      />
      <span aria-hidden="true" className="font-semibold">{isLive ? countFormatter.format(presence) : "–"}</span>
      <Eye aria-hidden="true" className="size-3.5 text-muted-foreground min-[440px]:hidden" />
      <span aria-hidden="true" className="hidden text-muted-foreground min-[440px]:inline">
        {spectatorLabel}
      </span>
    </div>
  );
}
