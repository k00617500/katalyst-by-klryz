"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { verifyAdminSession } from "@/lib/auth/dal";
import { slugify } from "@/lib/cms/slug";
import { createCategory, deleteCategory, isCategorySlugAvailable, updateCategory } from "@/lib/cms/categories";

const schema = z.object({
  name: z.string().min(1, { error: "Name is required." }),
  slug: z.string().optional(),
  description: z.string().optional(),
});

export interface CategoryFormState {
  error?: string;
}

export async function createCategoryAction(_state: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await verifyAdminSession();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const slug = slugify(parsed.data.slug || parsed.data.name);
  if (!(await isCategorySlugAvailable(slug))) {
    return { error: "A category with that slug already exists." };
  }

  await createCategory({ name: parsed.data.name, slug, description: parsed.data.description || null });
  revalidatePath("/admin/categories");
  revalidatePath("/journal");
  return {};
}

export async function updateCategoryAction(id: string, _state: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await verifyAdminSession();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const slug = slugify(parsed.data.slug || parsed.data.name);
  if (!(await isCategorySlugAvailable(slug, id))) {
    return { error: "A category with that slug already exists." };
  }

  await updateCategory(id, { name: parsed.data.name, slug, description: parsed.data.description || null });
  revalidatePath("/admin/categories");
  revalidatePath("/journal");
  return {};
}

export async function deleteCategoryAction(id: string) {
  await verifyAdminSession();
  await deleteCategory(id);
  revalidatePath("/admin/categories");
  revalidatePath("/journal");
}
