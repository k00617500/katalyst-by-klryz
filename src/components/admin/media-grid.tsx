"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, Trash2, Upload, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadMediaAction, deleteMediaAction, updateAltTextAction, type UploadState } from "@/app/admin/(dashboard)/media/actions";
import { getPublicMediaUrl } from "@/lib/cms/media-url";
import type { MediaRow } from "@/types/database";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

export function MediaGrid({
  initialMedia,
  mode = "manage",
  onSelect,
}: {
  initialMedia: MediaRow[];
  mode?: "manage" | "picker";
  onSelect?: (media: MediaRow) => void;
}) {
  const [items, setItems] = useState(initialMedia);
  const [search, setSearch] = useState("");
  const [uploadState, uploadAction, uploadPending] = useActionState<UploadState, FormData>(uploadMediaAction, {});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { width, height } = await readImageDimensions(file);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("width", String(width));
    formData.set("height", String(height));

    startTransition(() => {
      uploadAction(formData);
    });
  }

  if (uploadState.media && !items.some((m) => m.id === uploadState.media!.id)) {
    setItems((prev) => [uploadState.media!, ...prev]);
  }

  const filtered = items.filter((m) => m.file_name.toLowerCase().includes(search.toLowerCase()));

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMediaAction(id);
      setItems((prev) => prev.filter((m) => m.id !== id));
    });
  }

  function handleAltChange(id: string, alt: string) {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, alt_text: alt } : m)));
    startTransition(() => updateAltTextAction(id, alt));
  }

  function handleCopy(url: string, id: string) {
    navigator.clipboard?.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search media..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploadPending}>
          {uploadPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload image
        </Button>
        {uploadState.error && <p className="text-sm text-destructive">{uploadState.error}</p>}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No images yet — upload one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((media) => {
            const url = getPublicMediaUrl(media.storage_path);
            return (
              <div key={media.id} className="group relative overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => onSelect?.(media)}
                  className={cn("relative block aspect-square w-full bg-muted", mode === "picker" && "cursor-pointer")}
                >
                  <Image src={url} alt={media.alt_text ?? media.file_name} fill className="object-cover" unoptimized />
                </button>
                <div className="space-y-1.5 p-2">
                  <p className="truncate text-xs font-medium text-foreground" title={media.file_name}>
                    {media.file_name}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {media.width && media.height ? `${media.width}×${media.height} · ` : ""}
                    {formatBytes(media.size_bytes)}
                  </p>
                  {mode === "manage" && (
                    <>
                      <Input
                        placeholder="Alt text"
                        defaultValue={media.alt_text ?? ""}
                        className="h-7 text-xs"
                        onBlur={(e) => handleAltChange(media.id, e.target.value)}
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          className="flex-1"
                          onClick={() => handleCopy(url, media.id)}
                        >
                          {copiedId === media.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                          {copiedId === media.id ? "Copied" : "Copy URL"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="hover:text-destructive"
                          onClick={() => handleDelete(media.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
