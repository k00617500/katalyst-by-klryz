import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAdminPosts, type AdminPostFilters } from "@/lib/cms/posts";
import { PostsTable } from "@/components/admin/posts-table";
import { PostsFilterBar } from "@/components/admin/posts-filter-bar";

export const metadata: Metadata = { title: "Articles — Admin", robots: { index: false } };

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const filters: AdminPostFilters = {
    status: params.status as AdminPostFilters["status"],
    search: params.search,
    sort: params.sort as AdminPostFilters["sort"],
  };
  const posts = await listAdminPosts(filters);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Articles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {posts.length} {posts.length === 1 ? "article" : "articles"}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">
            <Plus className="size-4" />
            Write new article
          </Link>
        </Button>
      </div>

      <PostsFilterBar initial={params} />
      <PostsTable posts={posts} />
    </div>
  );
}
