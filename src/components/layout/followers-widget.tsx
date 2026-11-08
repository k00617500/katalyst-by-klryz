"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { hasLocalPinballPlay } from "@/lib/pinball/leaderboard";
import type { NameTag } from "@/lib/follower-profile";
import {
  follow,
  fetchFollowerCount,
  fetchFollowers,
  fetchSelf,
  getCachedUsername,
  getDeviceId,
  unfollow,
  type Follower,
} from "@/lib/followers";

const OPEN_EVENT = "katalyst-open-followers";
const nameTagOptions: { label: string; value: NameTag | null }[] = [
  { label: "Man", value: "blue" },
  { label: "Woman", value: "rose" },
  { label: "LGBTQIA+", value: "spectrum" },
  { label: "Prefer to skip", value: null },
];
const MIN_USERNAME_LENGTH = 3;

const tagColors = {
  rose: "bg-[#D91656] text-white",
  blue: "bg-[#0002A1] text-white",
  spectrum: "bg-[linear-gradient(110deg,#ff59c7,#bbf28c,#9ee7ff,#b591f2)] text-[#241331]",
  gray: "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
};

function FollowerNameTag({ follower, className }: { follower: Follower; className?: string }) {
  return <span title={follower.username} className={cn(
    "min-w-0 max-w-full truncate rounded px-2 py-0.5 font-medium",
    tagColors[follower.nameTag ?? "gray"],
    className,
  )}>{follower.username}</span>;
}

/** Lets any component (e.g. the pinball arcade's "Follow Me" button) open the header's Followers modal. */
export function openFollowersModal() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function FollowersWidget({ compact = false }: { compact?: boolean }) {
  // The widget renders twice (desktop + mobile header, both mounted regardless of which is visible via CSS),
  // so each instance needs its own Realtime channel name — Supabase dedupes channels by name on the client.
  const channelId = useId();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [deviceId] = useState<string | null>(() => getDeviceId());
  const [self, setSelf] = useState<Follower | null>(null);
  const [followers, setFollowers] = useState<Follower[] | null>(null);
  const [username, setUsername] = useState(() => getCachedUsername() ?? "");
  const [nameTag, setNameTag] = useState<NameTag | null>(null);
  const [step, setStep] = useState<"username" | "profile">("username");
  const [followError, setFollowError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);
  const [unfollowError, setUnfollowError] = useState("");

  const refreshCount = useCallback(async () => {
    const value = await fetchFollowerCount();
    setCount(value);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    fetchFollowerCount().then((value) => {
      if (active) setCount(value);
    });

    const channel = client
      .channel(`followers-count-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "followers" }, () => {
        fetchFollowerCount().then((value) => {
          if (active) setCount(value);
        });
      })
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [channelId]);

  const loadModalData = useCallback(async () => {
    if (!deviceId) return;
    const [selfRow, list] = await Promise.all([fetchSelf(deviceId), fetchFollowers()]);
    setSelf(selfRow?.isFollowing ? selfRow : null);
    setNameTag(selfRow?.isFollowing ? selfRow.nameTag : null);
    setFollowers(list);
  }, [deviceId]);

  const openModal = useCallback(() => {
    setFollowError("");
    setStep("username");
    setOpen(true);
    void loadModalData();
  }, [loadModalData]);

  useEffect(() => {
    const handleExternalOpen = () => {
      // Two instances are always mounted (desktop + mobile header); only the one matching the
      // current viewport should respond, so a single external trigger doesn't stack two dialogs.
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (isDesktop === !compact) openModal();
    };
    window.addEventListener(OPEN_EVENT, handleExternalOpen);
    return () => window.removeEventListener(OPEN_EVENT, handleExternalOpen);
  }, [compact, openModal]);

  const handleFollow = useCallback(async () => {
    const handle = self?.username ?? username.trim();
    if (!deviceId || !handle || busy) return;
    setFollowError("");
    setBusy(true);
    const result = await follow(deviceId, handle, nameTag);
    setBusy(false);
    if (!result.follower) { setFollowError(result.error); return; }
    setSelf(result.follower);
    await Promise.all([refreshCount(), loadModalData()]);
  }, [deviceId, self, username, nameTag, busy, refreshCount, loadModalData]);

  const handleUnfollow = useCallback(async (confirmed: boolean) => {
    if (!deviceId || busy) return;
    setUnfollowError("");
    if (!confirmed && hasLocalPinballPlay(deviceId)) {
      setConfirmUnfollow(true);
      return;
    }
    setBusy(true);
    const result = await unfollow(deviceId, confirmed);
    setBusy(false);
    if (result === "confirmation_required") {
      setConfirmUnfollow(true);
      return;
    }
    if (result !== "unfollowed") {
      setUnfollowError(result === "unavailable" ? "Score reset is temporarily unavailable. You’re still following." : "Couldn’t unfollow. Please try again.");
      return;
    }
    setConfirmUnfollow(false);
    setSelf(null);
    setUsername("");
    setNameTag(null);
    setStep("username");
    await Promise.all([refreshCount(), loadModalData()]);
  }, [deviceId, busy, refreshCount, loadModalData]);

  if (!supabase) return null;

  const orderedFollowers = followers
    ? [...followers].sort((a, b) => {
        if (a.deviceId === deviceId) return -1;
        if (b.deviceId === deviceId) return 1;
        return 0;
      })
    : null;

  return (
    <>
      {compact ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="relative gap-1 rounded-full pr-2.5 pl-2.5"
          aria-label={`Follow this site — ${count ?? 0} followers`}
          onClick={openModal}
        >
          <span className="font-mono text-xs tabular-nums">{count ?? "–"}</span>
          <span className="font-mono text-xs">Followers</span>
          <Plus className="size-3.5" />
        </Button>
      ) : (
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 py-1 pr-1 pl-3 text-sm">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {count ?? "–"} Followers
          </span>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="rounded-full"
            aria-label="Follow this site"
            onClick={openModal}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) { setConfirmUnfollow(false); setUnfollowError(""); }
      }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[40rem] sm:p-6">
          {confirmUnfollow ? (
            <>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>Your scores will be reverted back to zero.</DialogDescription>
              </DialogHeader>
              {unfollowError && <p role="alert" className="text-sm text-destructive">{unfollowError}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => { setConfirmUnfollow(false); setUnfollowError(""); }}>Cancel</Button>
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void handleUnfollow(true)}>Proceed</Button>
              </div>
            </>
          ) : <>
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
            <DialogDescription>
              {self
                ? "You're already following this site on this device."
                : step === "username"
                ? "Pick a username and join the list below — no account, no password, just you."
                : "One more thing before you join the list."}
            </DialogDescription>
          </DialogHeader>

          {self ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <UserRound className="size-4 shrink-0 text-muted-foreground" />
                  <span className="shrink-0 text-sm text-muted-foreground">Following as</span>
                  <FollowerNameTag follower={self} />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleUnfollow(false)}
                >
                  Unfollow
                </Button>
              </div>
              {self.nameTagSet ? (
                <p className="text-xs text-muted-foreground">You&apos;ve already answered &ldquo;How should I address you?&rdquo; — that choice is locked in and can&apos;t be changed.</p>
              ) : (
                <>
                  <fieldset className="space-y-2" disabled={busy}>
                    <legend className="text-sm font-medium">How should I address you?</legend>
                    <p className="text-xs text-muted-foreground">Select the option that best represents you. This question is optional. Your choice sets your public name-tag color, and can&apos;t be changed once saved.</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {nameTagOptions.map(({ label, value }) => (
                        <label key={label} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-2 text-xs">
                          <input type="radio" name={`name-tag-${channelId}`} checked={nameTag === value} onChange={() => setNameTag(value)} />
                          <span className={cn("size-3 shrink-0 rounded-sm", tagColors[value ?? "gray"])} aria-hidden="true" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Button type="button" className="w-full" disabled={busy} onClick={() => void handleFollow()}>
                    Save name tag
                  </Button>
                </>
              )}
            </>
          ) : step === "username" ? (
            <div className="space-y-2">
              <label htmlFor="follower-username" className="text-xs font-medium text-muted-foreground">
                Following as:
              </label>
              <div className="flex gap-2">
                <Input
                  id="follower-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && username.trim().length >= MIN_USERNAME_LENGTH) setStep("profile");
                  }}
                  placeholder="Enter your username"
                  maxLength={40}
                  autoComplete="off"
                  disabled={busy}
                />
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={username.trim().length < MIN_USERNAME_LENGTH}
                onClick={() => setStep("profile")}
              >
                Next
              </Button>
            </div>
          ) : (
            <>
              <fieldset className="space-y-2" disabled={busy}>
                <legend className="text-sm font-medium">How should I address you?</legend>
                <p className="text-xs text-muted-foreground">Select the option that best represents you. This question is optional.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {nameTagOptions.map(({ label, value }) => (
                    <label key={label} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-2 text-xs">
                      <input type="radio" name={`name-tag-${channelId}`} checked={nameTag === value} onChange={() => setNameTag(value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Button type="button" className="w-full" disabled={busy} onClick={() => void handleFollow()}>
                Done
              </Button>
            </>
          )}
          {followError && <p role="alert" className="text-sm text-destructive">{followError}</p>}
          {unfollowError && <p role="alert" className="text-sm text-destructive">{unfollowError}</p>}

          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {count ?? 0} {count === 1 ? "follower" : "followers"}
            </p>
            <div className="flex max-h-[min(42dvh,21rem)] flex-wrap gap-2 overflow-y-auto">
              {orderedFollowers === null && (
                <p className="w-full py-4 text-center text-xs text-muted-foreground">Loading…</p>
              )}
              {orderedFollowers?.length === 0 && (
                <p className="w-full py-4 text-center text-xs text-muted-foreground">
                  No followers yet — be the first.
                </p>
              )}
              {orderedFollowers?.map((follower) => {
                const isSelf = follower.deviceId === deviceId;
                return (
                  <div key={follower.deviceId} className="flex min-w-0 max-w-full items-center gap-1.5">
                    <FollowerNameTag follower={follower} className={isSelf ? "ring-2 ring-offset-2 ring-offset-background ring-border" : undefined} />
                    {isSelf && <span className="shrink-0 font-mono text-[10px] text-muted-foreground">You</span>}
                  </div>
                );
              })}
            </div>
          </div>
          </>}
        </DialogContent>
      </Dialog>
    </>
  );
}
