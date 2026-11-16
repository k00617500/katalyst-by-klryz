import type { Metadata } from "next";
import { listCategories } from "@/lib/cms/categories";
import { listTags } from "@/lib/cms/tags";
import { listMedia } from "@/lib/cms/media";
import { PostEditor } from "@/components/admin/editor/post-editor";

export const metadata: Metadata = { title: "New Article — Admin", robots: { index: false } };

export default async function NewPostPage() {
  const [categories, tags, media] = await Promise.all([listCategories(), listTags(), listMedia()]);

  return <PostEditor post={null} categories={categories} tags={tags} media={media} />;
}
