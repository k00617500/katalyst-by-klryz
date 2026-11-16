import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow } from "@/types/database";

export async function listCategories(): Promise<CategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listCategoriesWithCounts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*, posts:posts(count)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { posts, ...category } = row as CategoryRow & { posts?: { count: number }[] };
    return { ...category, postCount: posts?.[0]?.count ?? 0 };
  });
}

export async function createCategory(input: { name: string; slug: string; description?: string | null }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").insert(input).select().single();
  if (error) throw error;
  return data as CategoryRow;
}

export async function updateCategory(
  id: string,
  input: Partial<{ name: string; slug: string; description: string | null }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as CategoryRow;
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function isCategorySlugAvailable(slug: string, excludeId?: string) {
  const supabase = await createClient();
  let query = supabase.from("categories").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.maybeSingle();
  return !data;
}
