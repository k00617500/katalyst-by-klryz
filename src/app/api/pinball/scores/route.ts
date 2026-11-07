import { supabase } from "@/lib/supabase";
import { MAX_SCORE, STARTING_BALLS } from "@/lib/pinball/config";

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!supabase) return new Response(null, { status: 503 });
  const row = await request.json().catch(() => null);
  if (!row || typeof row.id !== "string" || !uuid.test(row.id) ||
    typeof row.deviceId !== "string" || !uuid.test(row.deviceId) ||
    typeof row.username !== "string" || row.username.length > 40 ||
    !Number.isInteger(row.score) || row.score < 0 || row.score > MAX_SCORE ||
    !Number.isInteger(row.ballsUsed) || row.ballsUsed < 1 || row.ballsUsed > STARTING_BALLS ||
    !Number.isInteger(row.levelReached) || row.levelReached < 1 || row.levelReached > 5 ||
    typeof row.playedAt !== "string" || !Number.isFinite(Date.parse(row.playedAt))) {
    return new Response(null, { status: 400 });
  }

  const follower = await supabase.from("followers").select("username")
    .eq("device_id", row.deviceId).eq("is_following", true).maybeSingle();
  if (follower.error) return new Response(null, { status: 503 });
  if (!follower.data || follower.data.username.trim().toLowerCase() !== row.username.trim().toLowerCase()) {
    return new Response(null, { status: 403 });
  }

  const { error } = await supabase.from("pinball_scores").upsert({
    id: row.id,
    device_id: row.deviceId,
    username: follower.data.username,
    score: row.score,
    level_reached: row.levelReached,
    balls_used: row.ballsUsed,
    played_at: new Date(Math.min(Date.now(), Date.parse(row.playedAt))).toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });
  return new Response(null, { status: error ? error.code === "42501" ? 403 : 503 : 204 });
}
