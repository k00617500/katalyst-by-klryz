"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { headerCounterIcon, headerCounterPill } from "@/components/layout/header-counter-styles";
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
    <div title={label} className={headerCounterPill}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">{isLive ? countFormatter.format(presence) : "–"}</span>
      <span aria-hidden="true">{spectatorLabel}</span>
      <span aria-hidden="true" className={headerCounterIcon}>
        <span className={cn("size-1.5 rounded-full", isLive ? "bg-brand-ink" : "bg-muted-foreground/55")} />
      </span>
    </div>
  );
}
