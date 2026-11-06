"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ViewToggle, type ContentView } from "@/components/ui/view-toggle";
import { cn } from "@/lib/utils";
import type { JournalFrontmatter } from "@/lib/journal";
export function JournalArticles({ articles }: { articles: { slug: string; frontmatter: JournalFrontmatter; readingTime: string }[] }) {
  const [view, setView] = useState<ContentView>("list");
  return <>
    <div className="mb-8 flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground">Field notes on design, development, and building useful things.</p><ViewToggle value={view} onChange={setView} /></div>
    <div className={cn(view === "grid" ? "grid gap-6 md:grid-cols-2" : "divide-y divide-border border-y border-border")}>
      {articles.map(({ slug, frontmatter, readingTime }) => <article key={slug} className={cn("group", view === "grid" ? "flex flex-col rounded-lg border border-border p-6" : "py-8 md:py-10")}>
        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground"><time dateTime={frontmatter.date}>{new Date(`${frontmatter.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time><span>· {readingTime}</span></div>
        <h2 className="mt-4 text-2xl leading-tight font-medium tracking-tight md:text-3xl"><Link href={`/journal/${slug}`} className="transition-colors hover:text-brand-ink">{frontmatter.title}</Link></h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{frontmatter.excerpt}</p>
        <Link href={`/journal/${slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-ink">Read the article <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>
      </article>)}
    </div>
  </>;
}
