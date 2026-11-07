import { supabase } from "@/lib/supabase";
import { resetPinballScores } from "@/lib/pinball/leaderboard";
import { isNameTag, type NameTag } from "@/lib/follower-profile";

const DEVICE_ID_KEY = "katalyst-follower-device-id";
const USERNAME_KEY = "katalyst-follower-username";

/** Fired after a successful follow/unfollow, for listeners that don't want to depend on
 * Supabase Realtime being enabled for this table (it requires a one-time dashboard/SQL step). */
export const FOLLOW_CHANGE_EVENT = "katalyst-follow-changed";

function notifyFollowChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(FOLLOW_CHANGE_EVENT));
}

export interface Follower {
  deviceId: string;
  username: string;
  isFollowing: boolean;
  createdAt: string;
  nameTag: NameTag | null;
}

/**
 * A random id generated once per browser/device and kept in localStorage, so a
 * returning visitor is recognized across reloads without any login.
 */
export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function getCachedUsername(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(USERNAME_KEY);
  } catch {
    return null;
  }
}

function cacheUsername(username: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (username) window.localStorage.setItem(USERNAME_KEY, username);
    else window.localStorage.removeItem(USERNAME_KEY);
  } catch {
    /* localStorage can be unavailable (private mode, blocked storage) — the feature still works, just not remembered. */
  }
}

type FollowerRow = { device_id: string; username: string; is_following: boolean; created_at: string; name_tag?: unknown };
const fields = "device_id, username, is_following, created_at";

function mapRow(row: FollowerRow): Follower {
  return { deviceId: row.device_id, username: row.username, isFollowing: row.is_following, createdAt: row.created_at,
    nameTag: isNameTag(row.name_tag) ? row.name_tag : null };
}

function missingNameTags(error: { code: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export async function fetchFollowerCount(): Promise<number> {
  if (!supabase) return 0;
  const { count } = await supabase
    .from("followers")
    .select("*", { count: "exact", head: true })
    .eq("is_following", true);
  return count ?? 0;
}

export async function fetchFollowers(): Promise<Follower[]> {
  const client = supabase;
  if (!client) return [];
  const list = (columns: string) => client
    .from("followers")
    .select(columns)
    .eq("is_following", true)
    .order("created_at", { ascending: true });
  const result = await list(fields + ", name_tag");
  const { data } = missingNameTags(result.error) ? await list(fields) : result;
  return ((data ?? []) as unknown as FollowerRow[]).map(mapRow);
}

export async function fetchSelf(deviceId: string): Promise<Follower | null> {
  const client = supabase;
  if (!client) return null;
  const get = (columns: string) => client
    .from("followers")
    .select(columns)
    .eq("device_id", deviceId)
    .maybeSingle();
  const result = await get(fields + ", name_tag");
  const { data, error } = missingNameTags(result.error) ? await get(fields) : result;
  const row = data as unknown as FollowerRow | null;
  if (!error) cacheUsername(row?.is_following ? row.username : null);
  return row ? mapRow(row) : null;
}

export async function follow(deviceId: string, username: string, nameTag: NameTag | null): Promise<
  { follower: Follower; error?: never } | { follower?: never; error: string }
> {
  try {
    const response = await fetch("/api/followers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, username, nameTag }),
    });
    const result = await response.json();
    if (!response.ok) return { error: result.error ?? "Couldn’t save your follower profile." };
    if (result.freshFollow) resetPinballScores(deviceId);
    const follower = mapRow(result.follower);
    cacheUsername(follower.username);
    notifyFollowChange();
    return { follower };
  } catch {
    return { error: "Couldn’t reach the follower service. Please try again." };
  }
}

export async function unfollow(deviceId: string, confirmReset: boolean): Promise<"unfollowed" | "confirmation_required" | "unavailable" | "failed"> {
  if (!supabase) return "unavailable";
  const { data, error } = await supabase.rpc("unfollow_pinball_player", {
    p_device_id: deviceId, p_confirm_reset: confirmReset,
  });
  if (error?.code === "PGRST202" || error?.code === "42883") return "unavailable";
  if (error) return "failed";
  if (data === "confirmation_required") return data;
  if (data !== "unfollowed") return "failed";
  cacheUsername(null);
  resetPinballScores(deviceId);
  notifyFollowChange();
  return "unfollowed";
}
