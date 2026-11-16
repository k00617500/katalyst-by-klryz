import type { Metadata } from "next";
import { listMedia } from "@/lib/cms/media";
import { MediaGrid } from "@/components/admin/media-grid";

export const metadata: Metadata = { title: "Media — Admin", robots: { index: false } };

export default async function AdminMediaPage() {
  const media = await listMedia();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Media library</h1>
        <p className="mt-1 text-sm text-muted-foreground">{media.length} files</p>
      </div>
      <MediaGrid initialMedia={media} />
    </div>
  );
}
