import type { PostWithRelations } from "@/lib/cms/posts";
import { profile } from "@/data/profile";

export function ArticleJsonLd({ article }: { article: PostWithRelations }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const json = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.social_image || article.cover_image || undefined,
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at,
    author: { "@type": "Person", name: article.author?.display_name ?? profile.name },
    mainEntityOfPage: `${siteUrl}/journal/${article.slug}`,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
