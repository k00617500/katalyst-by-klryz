import { readdir } from "node:fs/promises";
import path from "node:path";
import type { PlaygroundItem } from "@/data/playground";

export async function getPlaygroundItems(): Promise<PlaygroundItem[]> {
  const entries = await readdir(path.join(process.cwd(), "public", "images", "playground"), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(jpe?g|png|webp|avif|gif)$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
    .map((entry, index) => ({
      id: entry.name,
      title: `Playground ${String(index + 1).padStart(2, "0")}`,
      category: "photography",
      image: `/images/playground/${encodeURIComponent(entry.name)}`,
    }));
}
