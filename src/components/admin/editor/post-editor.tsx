"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { Loader2, Check, ImageOff, Eye, Send, CalendarClock, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditorToolbar } from "@/components/admin/editor/editor-toolbar";
import { MediaPickerDialog } from "@/components/admin/editor/media-picker-dialog";
import { getPublicMediaUrl } from "@/lib/cms/media-url";
import { slugify } from "@/lib/cms/slug";
import {
  checkSlugAvailability,
  deleteAction,
  publishAction,
  publishNowAction,
  saveDraft,
  scheduleAction,
  scheduleNowAction,
  unpublishAction,
  unscheduleAction,
} from "@/app/admin/(dashboard)/posts/actions";
import type { PostWithRelations } from "@/lib/cms/posts";
import type { CategoryRow, MediaRow, TagRow } from "@/types/database";

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** ISO string -> "YYYY-MM-DDTHH:mm" in the browser's local time, for <input type="datetime-local">. */
function toLocalDatetimeInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function PostEditor({
  post,
  categories,
  tags,
  media,
}: {
  post: PostWithRelations | null;
  categories: CategoryRow[];
  tags: TagRow[];
  media: MediaRow[];
}) {
  const [, startTransition] = useTransition();

  const [title, setTitle] = useState(post?.title ?? "");
  const [manualSlug, setManualSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const slug = slugTouched ? manualSlug : slugify(title);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [categoryId, setCategoryId] = useState(post?.category_id ?? "");
  const [tagIds, setTagIds] = useState<string[]>(post?.tags.map((t) => t.id) ?? []);
  const [coverImage, setCoverImage] = useState(post?.cover_image ?? "");
  const [coverImageAlt, setCoverImageAlt] = useState(post?.cover_image_alt ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seo_description ?? "");
  const [socialImage, setSocialImage] = useState(post?.social_image ?? "");

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [dirty, setDirty] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [socialPickerOpen, setSocialPickerOpen] = useState(false);
  const [contentPickerOpen, setContentPickerOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => toLocalDatetimeInputValue(post?.scheduled_at));

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      TiptapImage,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      CharacterCount,
    ],
    content: post?.content ?? { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: () => setDirty(true),
  });

  useEffect(() => {
    if (!slug) return;
    const handle = setTimeout(async () => {
      const available = await checkSlugAvailability(slug, post?.id);
      setSlugError(available ? null : "This slug is already in use.");
    }, 400);
    return () => clearTimeout(handle);
  }, [slug, post?.id]);

  function buildFormData() {
    const formData = new FormData();
    if (post?.id) formData.set("postId", post.id);
    formData.set("title", title);
    formData.set("slug", slug);
    formData.set("excerpt", excerpt);
    formData.set("content", JSON.stringify(editor?.getJSON() ?? {}));
    formData.set("coverImage", coverImage);
    formData.set("coverImageAlt", coverImageAlt);
    formData.set("categoryId", categoryId);
    formData.set("seoTitle", seoTitle);
    formData.set("seoDescription", seoDescription);
    formData.set("socialImage", socialImage);
    tagIds.forEach((id) => formData.append("tagIds", id));
    return formData;
  }

  function runSave() {
    if (!title.trim() || slugError) return;
    setStatus("saving");
    startTransition(async () => {
      const result = await saveDraft({}, buildFormData());
      if (result?.error) {
        setStatus("error");
      } else {
        setStatus("saved");
        setDirty(false);
      }
    });
  }

  // Autosave: 1.5s after the last change, while editing an existing draft.
  useEffect(() => {
    if (!dirty || !post?.id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(runSave, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, excerpt, categoryId, tagIds, coverImage, coverImageAlt, seoTitle, seoDescription, socialImage, dirty, post?.id]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => setDirty(true);
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const wordCount = editor?.storage.characterCount?.words() ?? 0;

  const handleManualSave = () => {
    if (!title.trim()) return;
    setStatus("saving");
    startTransition(async () => {
      const result = await saveDraft({}, buildFormData());
      if (result?.error) setStatus("error");
      else {
        setStatus("saved");
        setDirty(false);
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <StatusPill status={status} />
          {post?.status && <StatusBadge status={post.status} />}
          {post?.status === "scheduled" && post.scheduled_at && (
            <span className="text-xs text-muted-foreground">
              Publishes {new Date(post.scheduled_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {post?.id && (
            <Button variant="ghost" size="sm" asChild>
              <a href={`/journal/${slug}?preview=1`} target="_blank" rel="noreferrer">
                <Eye className="size-4" /> Preview
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleManualSave} disabled={!title.trim() || Boolean(slugError)}>
            Save draft
          </Button>
          {post?.id && post.status === "published" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startTransition(() => unpublishAction(post.id))}
            >
              <EyeOff className="size-4" /> Unpublish
            </Button>
          ) : (
            <>
              {post?.status === "scheduled" && (
                <Button variant="ghost" size="sm" onClick={() => startTransition(() => unscheduleAction(post.id))}>
                  Cancel schedule
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScheduleOpen(true)}
                disabled={!title.trim() || Boolean(slugError)}
              >
                <CalendarClock className="size-4" /> {post?.status === "scheduled" ? "Reschedule" : "Schedule"}
              </Button>
              <Button
                size="sm"
                disabled={!title.trim() || Boolean(slugError)}
                onClick={() => {
                  setStatus("saving");
                  startTransition(async () => {
                    if (post?.id) {
                      await publishAction(post.id);
                      setStatus("saved");
                      setDirty(false);
                      return;
                    }
                    const result = await publishNowAction({}, buildFormData());
                    if (result?.error) setStatus("error");
                    else {
                      setStatus("saved");
                      setDirty(false);
                    }
                  });
                }}
              >
                <Send className="size-4" /> Publish now
              </Button>
            </>
          )}
          {post?.id && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:text-destructive"
              onClick={() => {
                if (window.confirm("Delete this article? This cannot be undone.")) {
                  startTransition(() => deleteAction(post.id));
                }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 p-4 lg:grid-cols-[1fr_320px] lg:p-10">
        <div className="space-y-6">
          <div>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              placeholder="Article title"
              className="h-auto border-none px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
            />
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">/journal/</span>
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setManualSlug(slugify(e.target.value));
                  setDirty(true);
                }}
                className="w-full max-w-xs bg-transparent font-mono text-sm outline-none"
              />
            </div>
            {slugError && <p className="mt-1 text-xs text-destructive">{slugError}</p>}
          </div>

          <Textarea
            value={excerpt}
            onChange={(e) => {
              setExcerpt(e.target.value);
              setDirty(true);
            }}
            placeholder="Short excerpt shown in the Journal listing..."
            rows={2}
          />

          <div className="rounded-lg border border-border">
            <EditorToolbar editor={editor} onInsertImage={() => setContentPickerOpen(true)} />
            <EditorContent
              editor={editor}
              className="prose prose-neutral dark:prose-invert min-h-[50vh] max-w-none p-6 focus:outline-none [&_.ProseMirror]:min-h-[50vh] [&_.ProseMirror]:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">{wordCount} words</p>
        </div>

        <aside className="space-y-6">
          <section className="space-y-2">
            <Label>Featured image</Label>
            {coverImage ? (
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border">
                <Image src={coverImage} alt={coverImageAlt || title} fill className="object-cover" unoptimized />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCoverPickerOpen(true)}
                className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-accent"
              >
                <ImageOff className="size-6" />
              </button>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setCoverPickerOpen(true)}>
              {coverImage ? "Change image" : "Choose image"}
            </Button>
            {coverImage && (
              <Input
                placeholder="Alt text"
                value={coverImageAlt}
                onChange={(e) => {
                  setCoverImageAlt(e.target.value);
                  setDirty(true);
                }}
              />
            )}
          </section>

          <section className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={categoryId || undefined}
              onValueChange={(v) => {
                setCategoryId(v);
                setDirty(true);
              }}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const active = tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setTagIds((prev) => (active ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]));
                      setDirty(true);
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? "border-brand/30 bg-brand/10 text-brand-ink"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
              {tags.length === 0 && <p className="text-xs text-muted-foreground">No tags yet.</p>}
            </div>
          </section>

          <details className="space-y-3 rounded-lg border border-border p-3 open:pb-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">SEO &amp; sharing</summary>
            <div className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="seoTitle">SEO title</Label>
                <Input id="seoTitle" value={seoTitle} onChange={(e) => { setSeoTitle(e.target.value); setDirty(true); }} placeholder={title} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seoDescription">Meta description</Label>
                <Textarea id="seoDescription" value={seoDescription} onChange={(e) => { setSeoDescription(e.target.value); setDirty(true); }} rows={3} placeholder={excerpt} />
              </div>
              <div className="space-y-1.5">
                <Label>Social sharing image</Label>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setSocialPickerOpen(true)}>
                  {socialImage ? "Change image" : "Choose image"}
                </Button>
              </div>
            </div>
          </details>
        </aside>
      </div>

      <MediaPickerDialog
        open={coverPickerOpen}
        onOpenChange={setCoverPickerOpen}
        media={media}
        onSelect={(m) => {
          setCoverImage(getPublicMediaUrl(m.storage_path));
          setCoverImageAlt(m.alt_text ?? "");
          setDirty(true);
        }}
      />
      <MediaPickerDialog
        open={socialPickerOpen}
        onOpenChange={setSocialPickerOpen}
        media={media}
        onSelect={(m) => {
          setSocialImage(getPublicMediaUrl(m.storage_path));
          setDirty(true);
        }}
      />
      <MediaPickerDialog
        open={contentPickerOpen}
        onOpenChange={setContentPickerOpen}
        media={media}
        onSelect={(m) => {
          editor?.chain().focus().setImage({ src: getPublicMediaUrl(m.storage_path), alt: m.alt_text ?? "" }).run();
        }}
      />

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule publication</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Publish at</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!scheduledAt || !title.trim() || Boolean(slugError)}
              onClick={() => {
                if (!scheduledAt) return;
                const iso = new Date(scheduledAt).toISOString();
                setScheduleOpen(false);
                setStatus("saving");
                startTransition(async () => {
                  if (post?.id) {
                    await scheduleAction(post.id, iso);
                    setStatus("saved");
                    setDirty(false);
                    return;
                  }
                  const result = await scheduleNowAction(buildFormData(), iso);
                  if (result?.error) setStatus("error");
                  else {
                    setStatus("saved");
                    setDirty(false);
                  }
                });
              }}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Saving...
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="size-3 text-brand-ink" /> Saved
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-xs text-destructive">Couldn&apos;t save</span>;
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
      {status}
    </span>
  );
}
