import type { MetadataRoute } from "next";
import { projects } from "@/data/projects";
import { listPublishedPosts } from "@/lib/cms/posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const { posts } = await listPublishedPosts({ page: 1, pageSize: 500 });
  const journalRoutes = posts.map((post) => ({
    url: `${siteUrl}/journal/${post.slug}`,
    lastModified: new Date(post.updated_at),
  }));

  return [...staticRoutes, ...projectRoutes, ...journalRoutes];
}
