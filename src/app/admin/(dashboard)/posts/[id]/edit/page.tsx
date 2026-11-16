import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminPostById } from "@/lib/cms/posts";
import { listCategories } from "@/lib/cms/categories";
import { listTags } from "@/lib/cms/tags";
import { listMedia } from "@/lib/cms/media";
import { PostEditor } from "@/components/admin/editor/post-editor";

export const metadata: Metadata = { title: "Edit Article — Admin", robots: { index: false } };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, categories, tags, media] = await Promise.all([
    getAdminPostById(id),
    listCategories(),
    listTags(),
    listMedia(),
  ]);

  if (!post) notFound();

  return <PostEditor post={post} categories={categories} tags={tags} media={media} />;
}
