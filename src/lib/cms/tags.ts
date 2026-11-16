import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TagRow } from "@/types/database";

export async function listTags(): Promise<TagRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listTagsWithCounts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*, post_tags:post_tags(count)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { post_tags, ...tag } = row as TagRow & { post_tags?: { count: number }[] };
    return { ...tag, postCount: post_tags?.[0]?.count ?? 0 };
  });
}

export async function createTag(input: { name: string; slug: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").insert(input).select().single();
  if (error) throw error;
  return data as TagRow;
}

export async function updateTag(id: string, input: Partial<{ name: string; slug: string }>) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as TagRow;
}

export async function deleteTag(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}

export async function isTagSlugAvailable(slug: string, excludeId?: string) {
  const supabase = await createClient();
  let query = supabase.from("tags").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.maybeSingle();
  return !data;
}
