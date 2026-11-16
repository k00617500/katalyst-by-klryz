import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticleJsonLd } from "@/components/journal/article-json-ld";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { Button } from "@/components/ui/button";
import { SocialIconLinks } from "@/components/layout/social-icon-links";
import { TiptapRenderer } from "@/components/journal/tiptap-renderer";
import {
  getAdjacentPosts,
  getAnyPostBySlug,
  getPublishedPostBySlug,
  getRelatedPosts,
  recordPostView,
} from "@/lib/cms/posts";
import { verifyAdminSession } from "@/lib/auth/dal";
import { estimateReadingTime } from "@/lib/cms/content-text";
import { profile } from "@/data/profile";

async function resolveArticle(slug: string, isPreview: boolean) {
  if (!isPreview) return getPublishedPostBySlug(slug);

  // Preview mode shows drafts/scheduled posts, but only to a signed-in admin.
  try {
    await verifyAdminSession();
  } catch {
    return getPublishedPostBySlug(slug);
  }
  return getAnyPostBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedPostBySlug(slug);
  if (!article) return {};

  const title = article.seo_title || article.title;
  const description = article.seo_description || article.excerpt || undefined;
  const image = article.social_image || article.cover_image || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/journal/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: article.published_at ?? undefined,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: article.status === "published" ? undefined : { index: false, follow: false },
  };
}

export default async function JournalArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const article = await resolveArticle(slug, preview === "1");

  if (!article) notFound();
  const isUnpublishedPreview = article.status !== "published";

  if (!isUnpublishedPreview) {
    await recordPostView(article.id);
  }

  const [{ previous, next }, related] = await Promise.all([
    article.published_at ? getAdjacentPosts(article.published_at) : Promise.resolve({ previous: null, next: null }),
    getRelatedPosts(article.id, article.category_id, 2),
  ]);

  return (
    <>
      {!isUnpublishedPreview && <ArticleJsonLd article={article} />}

      {isUnpublishedPreview && (
        <div className="bg-brand/10 py-2 text-center text-sm text-brand-ink">
          Preview — this article is {article.status} and not visible to the public.
        </div>
      )}

      <article className="mx-auto w-full max-w-[840px] px-6 py-12 md:px-10 md:py-16">
        <Button asChild variant="ghost" size="sm" className="mb-8 -ml-3">
          <Link href="/journal">
            <ArrowLeft className="size-4" />
            Journal
          </Link>
        </Button>

        {article.category && (
          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {article.category.name}
          </span>
        )}
        <h1 className="mt-2 text-balance text-4xl font-medium tracking-tight md:text-5xl">{article.title}</h1>
        {article.excerpt && (
          <p className="mt-4 text-balance text-lg text-muted-foreground">{article.excerpt}</p>
        )}
        <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{article.author?.display_name ?? profile.name}</span>
          <span className="font-mono text-xs">{estimateReadingTime(article.content)}</span>
          {article.published_at && (
            <>
              <span>&middot;</span>
              <time dateTime={article.published_at}>
                {new Date(article.published_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </>
          )}
        </div>

        {article.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span key={tag.id} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-12">
          <TiptapRenderer content={article.content} />
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-border/60 pt-8">
          <span className="text-sm text-muted-foreground">Share this article</span>
          <SocialIconLinks />
        </div>

        {(previous || next) && (
          <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-8 text-sm">
            {previous ? (
              <Link href={`/journal/${previous.slug}`} className="text-muted-foreground hover:text-foreground">
                ← {previous.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/journal/${next.slug}`} className="text-muted-foreground hover:text-foreground">
                {next.title} →
              </Link>
            )}
          </div>
        )}
      </article>

      {related.length > 0 && (
        <section className="container-page section-y border-t border-border/60">
          <h2 className="mb-10 text-2xl font-medium tracking-tight">Related Articles</h2>
          <ScrollReveal stagger={0.08} className="grid gap-6 md:grid-cols-2">
            {related.map((a) => (
              <Link
                key={a.slug}
                href={`/journal/${a.slug}`}
                className="rounded-2xl border border-border p-6 transition-colors hover:border-brand"
              >
                <span className="font-mono text-xs text-muted-foreground uppercase">{a.category?.name}</span>
                <h3 className="mt-2 text-lg font-medium tracking-tight">{a.title}</h3>
              </Link>
            ))}
          </ScrollReveal>
        </section>
      )}
    </>
  );
}
