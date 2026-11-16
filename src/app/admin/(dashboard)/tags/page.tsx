import type { Metadata } from "next";
import { listTagsWithCounts } from "@/lib/cms/tags";
import { TagManager } from "@/components/admin/tag-manager";

export const metadata: Metadata = { title: "Tags — Admin", robots: { index: false } };

export default async function TagsPage() {
  const tags = await listTagsWithCounts();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tags</h1>
        <p className="mt-1 text-sm text-muted-foreground">Fine-grained labels readers can filter by.</p>
      </div>
      <TagManager initialTags={tags} />
    </div>
  );
}
