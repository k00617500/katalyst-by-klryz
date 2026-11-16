import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PostRow, PostStatus } from "@/types/database";

export interface PostWithRelations extends PostRow {
  category: { id: string; name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
  author: { id: string; display_name: string } | null;
}

const POST_SELECT = `
  *,
  category:categories(id, name, slug),
  tags:post_tags(tag:tags(id, name, slug)),
  author:profiles(id, display_name)
`;

interface RawPostRow extends Omit<PostRow, never> {
  category: PostWithRelations["category"];
  author: PostWithRelations["author"];
  tags: { tag: { id: string; name: string; slug: string } | null }[] | null;
}

function normalizePost(row: RawPostRow): PostWithRelations {
  return {
    ...row,
    tags: (row.tags ?? []).map((t) => t.tag).filter((tag): tag is NonNullable<typeof tag> => Boolean(tag)),
  };
}

// ---- Admin (authenticated) ----

export interface AdminPostFilters {
  status?: PostStatus;
  search?: string;
  sort?: "newest" | "oldest" | "title";
}

export async function listAdminPosts(filters: AdminPostFilters = {}): Promise<PostWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("posts").select(POST_SELECT);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  switch (filters.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "title":
      query = query.order("title", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizePost);
}

export async function getAdminPostById(id: string): Promise<PostWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizePost(data) : null;
}

export async function isSlugAvailable(slug: string, excludePostId?: string): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase.from("posts").select("id").eq("slug", slug);
  if (excludePostId) query = query.neq("id", excludePostId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return !data;
}

export interface PostInput {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: Record<string, unknown>;
  cover_image?: string | null;
  cover_image_alt?: string | null;
  category_id?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  social_image?: string | null;
  tagIds?: string[];
}

export async function createDraftPost(input: PostInput, authorId: string): Promise<PostWithRelations> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt ?? null,
      content: input.content,
      cover_image: input.cover_image ?? null,
      cover_image_alt: input.cover_image_alt ?? null,
      category_id: input.category_id ?? null,
      seo_title: input.seo_title ?? null,
      seo_description: input.seo_description ?? null,
      social_image: input.social_image ?? null,
      author_id: authorId,
      status: "draft",
    })
    .select(POST_SELECT)
    .single();

  if (error) throw error;

  if (input.tagIds?.length) {
    await setPostTags(data.id, input.tagIds);
  }

  return normalizePost(data);
}

export async function updatePost(id: string, input: Partial<PostInput>): Promise<PostWithRelations> {
  const supabase = await createClient();
  const { tagIds, ...fields } = input;

  const { data, error } = await supabase
    .from("posts")
    .update(fields)
    .eq("id", id)
    .select(POST_SELECT)
    .single();

  if (error) throw error;

  if (tagIds !== undefined) {
    await setPostTags(id, tagIds);
  }

  return normalizePost(data);
}

export async function setPostTags(postId: string, tagIds: string[]) {
  const supabase = await createClient();
  await supabase.from("post_tags").delete().eq("post_id", postId);
  if (tagIds.length) {
    await supabase.from("post_tags").insert(tagIds.map((tag_id) => ({ post_id: postId, tag_id })));
  }
}

export async function publishPost(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ status: "published", published_at: new Date().toISOString(), scheduled_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function schedulePost(id: string, scheduledAt: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ status: "scheduled", scheduled_at: scheduledAt, published_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function unschedulePost(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").update({ status: "draft", scheduled_at: null }).eq("id", id);
  if (error) throw error;
}

export async function unpublishPost(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").update({ status: "unpublished" }).eq("id", id);
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

// ---- Public (anon, RLS-filtered to published) ----

export interface PublicPostListParams {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  search?: string;
}

export async function listPublishedPosts({
  page = 1,
  pageSize = 9,
  categorySlug,
  search,
}: PublicPostListParams = {}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("posts")
    .select(POST_SELECT, { count: "exact" })
    .order("published_at", { ascending: false })
    .range(from, to);

  if (categorySlug) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    query = query.eq("category_id", category?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    posts: (data ?? []).map(normalizePost),
    total: count ?? 0,
    pageSize,
    page,
  };
}

export async function getPublishedPostBySlug(slug: string): Promise<PostWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? normalizePost(data) : null;
}

/** For admin previews: bypasses the published-only anon policy because the caller is authenticated. */
export async function getAnyPostBySlug(slug: string): Promise<PostWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? normalizePost(data) : null;
}

export async function recordPostView(postId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("post_views").insert({ post_id: postId });
}

export async function getAdjacentPosts(publishedAt: string) {
  const supabase = await createClient();
  const [{ data: prev }, { data: next }] = await Promise.all([
    supabase
      .from("posts")
      .select("title, slug")
      .lt("published_at", publishedAt)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("posts")
      .select("title, slug")
      .gt("published_at", publishedAt)
      .order("published_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  return { previous: prev ?? null, next: next ?? null };
}

export async function getRelatedPosts(postId: string, categoryId: string | null, limit = 3) {
  if (!categoryId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("category_id", categoryId)
    .neq("id", postId)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(normalizePost);
}
