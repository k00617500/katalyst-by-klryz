"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { verifyAdminSession } from "@/lib/auth/dal";
import { slugify } from "@/lib/cms/slug";
import {
  createDraftPost,
  deletePost,
  isSlugAvailable,
  publishPost,
  schedulePost,
  unpublishPost,
  unschedulePost,
  updatePost,
} from "@/lib/cms/posts";

const postSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  slug: z.string().min(1, { error: "Slug is required." }),
  excerpt: z.string().optional(),
  content: z.string(),
  coverImage: z.string().optional(),
  coverImageAlt: z.string().optional(),
  categoryId: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  socialImage: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

export interface PostFormState {
  error?: string;
  postId?: string;
}

function revalidateJournal() {
  revalidatePath("/journal");
  updateTag("journal-posts");
}

export async function checkSlugAvailability(slug: string, excludePostId?: string) {
  return isSlugAvailable(slug, excludePostId);
}

export async function suggestSlug(title: string) {
  return slugify(title);
}

function parsePostForm(formData: FormData) {
  const raw = {
    title: formData.get("title")?.toString() ?? "",
    slug: formData.get("slug")?.toString() ?? "",
    excerpt: formData.get("excerpt")?.toString() ?? "",
    content: formData.get("content")?.toString() ?? "{}",
    coverImage: formData.get("coverImage")?.toString() ?? "",
    coverImageAlt: formData.get("coverImageAlt")?.toString() ?? "",
    categoryId: formData.get("categoryId")?.toString() ?? "",
    seoTitle: formData.get("seoTitle")?.toString() ?? "",
    seoDescription: formData.get("seoDescription")?.toString() ?? "",
    socialImage: formData.get("socialImage")?.toString() ?? "",
    tagIds: formData.getAll("tagIds").map(String),
  };
  return postSchema.parse(raw);
}

export async function saveDraft(_state: PostFormState, formData: FormData): Promise<PostFormState> {
  const { profile, user } = await verifyAdminSession();
  const parsed = parsePostForm(formData);
  const postId = formData.get("postId")?.toString();

  if (!(await isSlugAvailable(parsed.slug, postId))) {
    return { error: "That slug is already in use by another article." };
  }

  let content: Record<string, unknown>;
  try {
    content = JSON.parse(parsed.content);
  } catch {
    return { error: "Article content could not be saved — try again." };
  }

  const input = {
    title: parsed.title,
    slug: parsed.slug,
    excerpt: parsed.excerpt || null,
    content,
    cover_image: parsed.coverImage || null,
    cover_image_alt: parsed.coverImageAlt || null,
    category_id: parsed.categoryId || null,
    seo_title: parsed.seoTitle || null,
    seo_description: parsed.seoDescription || null,
    social_image: parsed.socialImage || null,
    tagIds: parsed.tagIds,
  };

  if (postId) {
    await updatePost(postId, input);
    revalidateJournal();
    return { postId };
  }

  const created = await createDraftPost(input, profile?.id ?? user.id);
  redirect(`/admin/posts/${created.id}/edit`);
}

export async function publishAction(postId: string) {
  await verifyAdminSession();
  await publishPost(postId);
  revalidateJournal();
}

export async function scheduleAction(postId: string, scheduledAt: string) {
  await verifyAdminSession();
  await schedulePost(postId, scheduledAt);
  revalidateJournal();
}

export async function unpublishAction(postId: string) {
  await verifyAdminSession();
  await unpublishPost(postId);
  revalidateJournal();
}

export async function unscheduleAction(postId: string) {
  await verifyAdminSession();
  await unschedulePost(postId);
  revalidateJournal();
}

export async function deleteAction(postId: string) {
  await verifyAdminSession();
  await deletePost(postId);
  revalidateJournal();
  redirect("/admin/posts");
}
