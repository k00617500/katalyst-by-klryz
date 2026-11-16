import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getContentStats() {
  const supabase = await createClient();
  const [total, published, draft, scheduled, unpublished] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "unpublished"),
  ]);

  const { count: totalViews } = await supabase.from("post_views").select("id", { count: "exact", head: true });

  return {
    total: total.count ?? 0,
    published: published.count ?? 0,
    draft: draft.count ?? 0,
    scheduled: scheduled.count ?? 0,
    unpublished: unpublished.count ?? 0,
    totalViews: totalViews ?? 0,
  };
}

export interface TopArticle {
  id: string;
  title: string;
  slug: string;
  status: string;
  views: number;
}

export async function getTopArticles(limit = 5): Promise<TopArticle[]> {
  const supabase = await createClient();
  const { data: posts } = await supabase.from("posts").select("id, title, slug, status");
  if (!posts?.length) return [];

  const { data: views } = await supabase.from("post_views").select("post_id");
  const counts = new Map<string, number>();
  for (const row of views ?? []) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }

  return posts
    .map((p) => ({ ...p, views: counts.get(p.id) ?? 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export interface ScheduledPost {
  id: string;
  title: string;
  slug: string;
  scheduledAt: string;
}

export async function getScheduledPosts(): Promise<ScheduledPost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, title, slug, scheduled_at")
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true });

  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title || "Untitled",
    slug: p.slug,
    scheduledAt: p.scheduled_at,
  }));
}

export interface ActivityItem {
  action: string;
  title: string;
  timestamp: string;
  href: string;
}

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, title, slug, status, created_at, updated_at, published_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((post) => {
    const action =
      post.status === "published"
        ? "Published"
        : post.status === "scheduled"
          ? "Scheduled"
          : post.created_at === post.updated_at
            ? "Drafted"
            : "Updated";
    return {
      action,
      title: post.title || "Untitled",
      timestamp: post.updated_at,
      href: `/admin/posts/${post.id}/edit`,
    };
  });
}
