import { isNameTag } from "@/lib/follower-profile";
import { supabase } from "@/lib/supabase";

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const fields = "device_id, username, is_following, created_at";

export async function POST(request: Request) {
  const client = supabase;
  if (!client) return Response.json({ error: "Following is temporarily unavailable." }, { status: 503 });
  const input = await request.json().catch(() => null);
  const username = typeof input?.username === "string" ? input.username.trim() : "";
  const nameTag = input?.nameTag ?? null;
  if (typeof input?.deviceId !== "string" || !uuid.test(input.deviceId) || !username || username.length > 40 ||
    (nameTag !== null && !isNameTag(nameTag))) {
    return Response.json({ error: "Enter a username and select a valid name tag." }, { status: 400 });
  }

  const existing = await client.from("followers").select("username, is_following").eq("device_id", input.deviceId).maybeSingle();
  if (existing.error) return Response.json({ error: "Couldn’t check your follower status." }, { status: 503 });
  const row = {
    device_id: input.deviceId,
    username: existing.data?.is_following ? existing.data.username : username,
    is_following: true,
  };
  let result = await client.from("followers").upsert({ ...row, name_tag: nameTag }, { onConflict: "device_id" })
    .select(fields + ", name_tag").single();
  if (result.error?.code === "42703" || result.error?.code === "PGRST204") {
    if (nameTag !== null) {
      return Response.json({ error: "Colored name tags aren’t available yet. You can follow with the gray tag." }, { status: 503 });
    }
    result = await client.from("followers").upsert(row, { onConflict: "device_id" }).select(fields).single();
  }
  if (result.error || !result.data) return Response.json({ error: "Couldn’t save your follower profile." }, { status: 503 });
  return Response.json({ follower: result.data, freshFollow: !existing.data?.is_following });
}
