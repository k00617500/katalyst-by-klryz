import type { Metadata } from "next";
import { GlowPageHeader } from "@/components/sections/glow-page-header";
import { JournalArticles } from "@/components/sections/journal-articles";
import { getAllJournalArticles } from "@/lib/journal";

export const metadata: Metadata = { title: "Journal", description: "Technical notes, product observations, and startup lessons." };

export default function JournalPage() {
  const articles = getAllJournalArticles().map(({ slug, frontmatter, readingTime }) => ({ slug, frontmatter, readingTime }));
  return <>
    <GlowPageHeader eyebrow="Journal" title="Notes from the work." description="Thoughts on building software, designing with purpose, and learning along the way." />
    <section className="container-page border-t border-border/60 py-12 md:py-16"><JournalArticles articles={articles} /></section>
  </>;
}
