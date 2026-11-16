#!/usr/bin/env node
/**
 * One-time migration: moves the two hand-written MDX articles in
 * src/content/journal into the posts table, as published articles with their
 * original dates and slugs preserved. Run after applying the Supabase
 * migrations (0007-0009) and setting SUPABASE_SERVICE_ROLE_KEY locally:
 *
 *   node scripts/migrate-existing-posts.mjs
 *
 * Safe to re-run: skips any slug that's already in the posts table.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JOURNAL_DIR = path.join(__dirname, "..", "src", "content", "journal");

// Next.js keeps local config in .env.local, which Node doesn't load on its
// own — read it directly so this script can run with `node` or `npx tsx`.
const envLocalPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. via .env.local) first.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/** Minimal markdown -> Tiptap JSON for the plain prose these two posts use
 * (paragraphs, "## " headings, "**bold**"). Not a general-purpose parser. */
function markdownToTiptap(markdown) {
  const blocks = markdown.trim().split(/\n\s*\n/);
  const content = blocks.map((block) => {
    const headingMatch = block.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      return {
        type: "heading",
        attrs: { level: headingMatch[1].length },
        content: inlineContent(headingMatch[2]),
      };
    }
    return { type: "paragraph", content: inlineContent(block.replace(/\n/g, " ")) };
  });
  return { type: "doc", content };
}

function inlineContent(text) {
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) parts.push({ type: "text", text: text.slice(lastIndex, match.index) });
    parts.push({ type: "text", text: match[1], marks: [{ type: "bold" }] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: "text", text: text.slice(lastIndex) });
  return parts.length ? parts : [{ type: "text", text }];
}

async function ensureCategory(name) {
  if (!name) return null;
  const slug = slugify(name);
  const { data: existing } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("categories").insert({ name, slug }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const files = fs.existsSync(JOURNAL_DIR) ? fs.readdirSync(JOURNAL_DIR).filter((f) => f.endsWith(".mdx")) : [];
  if (files.length === 0) {
    console.log("No MDX files found in src/content/journal — nothing to migrate.");
    return;
  }

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const { data: frontmatter, content } = matter(fs.readFileSync(path.join(JOURNAL_DIR, file), "utf-8"));

    const { data: existingPost } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
    if (existingPost) {
      console.log(`Skipping "${slug}" — already migrated.`);
      continue;
    }

    const categoryId = await ensureCategory(frontmatter.category);
    const publishedAt = frontmatter.date ? new Date(frontmatter.date).toISOString() : new Date().toISOString();

    const { error } = await supabase.from("posts").insert({
      title: frontmatter.title ?? slug,
      slug,
      excerpt: frontmatter.excerpt ?? null,
      content: markdownToTiptap(content),
      category_id: categoryId,
      status: "published",
      published_at: publishedAt,
    });

    if (error) {
      console.error(`Failed to migrate "${slug}":`, error.message);
    } else {
      console.log(`Migrated "${slug}".`);
    }
  }

  console.log("\nDone. Verify the articles at /journal, then you can remove src/content/journal and src/lib/journal.ts.");
}

main();
