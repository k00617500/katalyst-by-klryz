"use client";

import { useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PINBALL_RESET_EVENT } from "@/lib/pinball/leaderboard";
import { FOLLOW_CHANGE_EVENT, fetchSelf, getCachedUsername, getDeviceId, type Follower } from "@/lib/followers";

/** Pinball reuses the followers device/username so "You're Playing As" always matches who's following. */
export function useFollowerIdentity() {
  const channelId = useId();
  const [deviceId] = useState<string | null>(() => getDeviceId());
  const [self, setSelf] = useState<Follower | null>(null);
  const [loaded, setLoaded] = useState(() => !supabase || !deviceId);

  useEffect(() => {
    const client = supabase;
    if (!client || !deviceId) return;
    let active = true;
    let request = 0;
    const clear = () => { request += 1; setSelf(null); };
    const refetch = () => {
      const current = ++request;
      return fetchSelf(deviceId).then((row) => {
        if (active && current === request) {
          setSelf(row?.isFollowing ? row : null);
          setLoaded(true);
        }
      });
    };
    void refetch();
    window.addEventListener(FOLLOW_CHANGE_EVENT, refetch);
    window.addEventListener(PINBALL_RESET_EVENT, clear);
    window.addEventListener("focus", refetch);
    const poll = window.setInterval(() => { if (!document.hidden) void refetch(); }, 15_000);

    const channel = client
      .channel(`pinball-identity-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "followers", filter: `device_id=eq.${deviceId}` }, refetch)
      .subscribe();

    return () => {
      active = false;
      window.removeEventListener(FOLLOW_CHANGE_EVENT, refetch);
      window.removeEventListener(PINBALL_RESET_EVENT, clear);
      window.removeEventListener("focus", refetch);
      window.clearInterval(poll);
      void client.removeChannel(channel);
    };
  }, [deviceId, channelId]);

  return {
    deviceId,
    isFollower: !!self,
    username: self?.username ?? getCachedUsername(),
    loaded,
  };
}
