import type { Metadata } from "next";
import { listCategoriesWithCounts } from "@/lib/cms/categories";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata: Metadata = { title: "Categories — Admin", robots: { index: false } };

export default async function CategoriesPage() {
  const categories = await listCategoriesWithCounts();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">Organize articles into topics.</p>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
