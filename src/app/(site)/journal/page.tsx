import type { Metadata } from "next";
import { GlowPageHeader } from "@/components/sections/glow-page-header";
import { JournalArticles } from "@/components/sections/journal-articles";
import { JournalFilters } from "@/components/journal/journal-filters";
import { JournalPagination } from "@/components/journal/journal-pagination";
import { listPublishedPosts } from "@/lib/cms/posts";
import { listCategories } from "@/lib/cms/categories";
import { estimateReadingTime } from "@/lib/cms/content-text";

export const metadata: Metadata = {
  title: "Journal",
  description: "Technical notes, product observations, and startup lessons.",
};

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [{ posts, total, pageSize }, categories] = await Promise.all([
    listPublishedPosts({ page, categorySlug: params.category, search: params.search }),
    listCategories(),
  ]);

  const articles = posts.map((post) => ({
    slug: post.slug,
    frontmatter: {
      title: post.title,
      // JournalArticles appends "T00:00:00" to this, so it needs a bare date, not a full ISO timestamp.
      date: (post.published_at ?? post.created_at).slice(0, 10),
      category: post.category?.name ?? "",
      excerpt: post.excerpt ?? "",
      coverImage: post.cover_image ?? undefined,
    },
    readingTime: estimateReadingTime(post.content),
  }));

  return (
    <>
      <GlowPageHeader
        eyebrow="Journal"
        title="Notes from the work."
        description="Thoughts on building software, designing with purpose, and learning along the way."
      />
      <section className="container-page border-t border-border/60 py-12 md:py-16">
        <JournalFilters categories={categories} initial={params} />
        {articles.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No articles match your filters yet.
          </p>
        ) : (
          <>
            <JournalArticles articles={articles} />
            <JournalPagination page={page} pageSize={pageSize} total={total} />
          </>
        )}
      </section>
    </>
  );
}
