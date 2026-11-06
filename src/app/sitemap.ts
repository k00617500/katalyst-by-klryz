import type { MetadataRoute } from "next";
import { projects } from "@/data/projects";
import { getJournalSlugs } from "@/lib/journal";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/about",
    "/projects",
    "/experience",
    "/achievements",
    "/playground",
    "/journal",
    "/contact",
  ].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
  }));

  const projectRoutes = projects.map((project) => ({
    url: `${siteUrl}/projects/${project.slug}`,
    lastModified: new Date(),
  }));

  const journalRoutes = getJournalSlugs().map((slug) => ({
    url: `${siteUrl}/journal/${slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...projectRoutes, ...journalRoutes];
}
