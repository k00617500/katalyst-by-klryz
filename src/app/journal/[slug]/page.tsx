import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { Button } from "@/components/ui/button";
import { SocialIconLinks } from "@/components/layout/social-icon-links";
import {
  getAllJournalArticles,
  getJournalArticle,
  getJournalSlugs,
} from "@/lib/journal";
import { profile } from "@/data/profile";

export function generateStaticParams() {
  return getJournalSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getJournalArticle(slug);
  if (!article) return {};
  return {
    title: article.frontmatter.title,
    description: article.frontmatter.excerpt,
    openGraph: {
      title: article.frontmatter.title,
      description: article.frontmatter.excerpt,
      type: "article",
      publishedTime: article.frontmatter.date,
    },
  };
}

const mdxComponents = {
  h2: (props: React.ComponentProps<"h2">) => (
    <h2 className="mt-10 mb-4 text-2xl font-medium tracking-tight" {...props} />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="mt-8 mb-3 text-xl font-medium tracking-tight" {...props} />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="mb-5 leading-relaxed text-muted-foreground" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mb-5 list-disc space-y-2 pl-6 text-muted-foreground" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a className="text-brand-ink underline underline-offset-4" {...props} />
  ),
};

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getJournalArticle(slug);
  if (!article) notFound();

  const related = getAllJournalArticles()
    .filter((a) => a.slug !== slug)
    .slice(0, 2);

  return (
    <>
      <article className="mx-auto w-full max-w-[840px] px-6 py-12 md:px-10 md:py-16">
        <Button asChild variant="ghost" size="sm" className="mb-8 -ml-3">
          <Link href="/journal">
            <ArrowLeft className="size-4" />
            Journal
          </Link>
        </Button>

        <h1 className="mt-4 text-balance text-4xl font-medium tracking-tight md:text-5xl">
          {article.frontmatter.title}
        </h1>
        {article.frontmatter.subtitle && (
          <p className="mt-4 text-balance text-lg text-muted-foreground">
            {article.frontmatter.subtitle}
          </p>
        )}
        <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{profile.name}</span>
          <span className="font-mono text-xs">{article.readingTime}</span>
          <span>&middot;</span>
          <time dateTime={article.frontmatter.date}>
            {new Date(article.frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>

        <div className="mt-12">
          <MDXRemote source={article.content} components={mdxComponents} />
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-border/60 pt-8">
          <span className="text-sm text-muted-foreground">Share this article</span>
          <SocialIconLinks />
        </div>
      </article>

      {related.length > 0 && (
        <section className="container-page section-y border-t border-border/60">
          <h2 className="mb-10 text-2xl font-medium tracking-tight">
            Related Articles
          </h2>
          <ScrollReveal stagger={0.08} className="grid gap-6 md:grid-cols-2">
            {related.map((a) => (
              <Link
                key={a.slug}
                href={`/journal/${a.slug}`}
                className="rounded-2xl border border-border p-6 transition-colors hover:border-brand"
              >
                <span className="font-mono text-xs text-muted-foreground uppercase">
                  {a.frontmatter.category}
                </span>
                <h3 className="mt-2 text-lg font-medium tracking-tight">
                  {a.frontmatter.title}
                </h3>
              </Link>
            ))}
          </ScrollReveal>
        </section>
      )}
    </>
  );
}
