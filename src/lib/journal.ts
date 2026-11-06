import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

const JOURNAL_DIR = path.join(process.cwd(), "src/content/journal");

export interface JournalFrontmatter {
  title: string;
  subtitle?: string;
  date: string;
  category: string;
  coverImage?: string;
  excerpt: string;
  featured?: boolean;
}

export interface JournalArticle {
  slug: string;
  frontmatter: JournalFrontmatter;
  content: string;
  readingTime: string;
}

export function getJournalSlugs(): string[] {
  if (!fs.existsSync(JOURNAL_DIR)) return [];
  return fs
    .readdirSync(JOURNAL_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getJournalArticle(slug: string): JournalArticle | null {
  const filePath = path.join(JOURNAL_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const stats = readingTime(content);

  return {
    slug,
    frontmatter: data as JournalFrontmatter,
    content,
    readingTime: `${Math.max(1, Math.ceil(stats.minutes))} MIN READ`,
  };
}

export function getAllJournalArticles(): JournalArticle[] {
  return getJournalSlugs()
    .map((slug) => getJournalArticle(slug))
    .filter((article): article is JournalArticle => article !== null)
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime(),
    );
}
