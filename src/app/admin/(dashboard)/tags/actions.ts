"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { verifyAdminSession } from "@/lib/auth/dal";
import { slugify } from "@/lib/cms/slug";
import { createTag, deleteTag, isTagSlugAvailable, updateTag } from "@/lib/cms/tags";

const schema = z.object({ name: z.string().min(1, { error: "Name is required." }) });

export interface TagFormState {
  error?: string;
}

export async function createTagAction(_state: TagFormState, formData: FormData): Promise<TagFormState> {
  await verifyAdminSession();
  const parsed = schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const slug = slugify(parsed.data.name);
  if (!(await isTagSlugAvailable(slug))) return { error: "A tag with that name already exists." };

  await createTag({ name: parsed.data.name, slug });
  revalidatePath("/admin/tags");
  revalidatePath("/journal");
  return {};
}

export async function renameTagAction(id: string, name: string) {
  await verifyAdminSession();
  const slug = slugify(name);
  if (!(await isTagSlugAvailable(slug, id))) throw new Error("A tag with that name already exists.");
  await updateTag(id, { name, slug });
  revalidatePath("/admin/tags");
  revalidatePath("/journal");
}

export async function deleteTagAction(id: string) {
  await verifyAdminSession();
  await deleteTag(id);
  revalidatePath("/admin/tags");
  revalidatePath("/journal");
}
