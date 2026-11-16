"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2, Send, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PostWithRelations } from "@/lib/cms/posts";
import { deleteAction, publishAction, unpublishAction } from "@/app/admin/(dashboard)/posts/actions";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  draft: "outline",
  scheduled: "secondary",
  published: "default",
  unpublished: "destructive",
};

export function PostsTable({ posts }: { posts: PostWithRelations[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">No articles match these filters yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostRow({ post }: { post: PostWithRelations }) {
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <tr className="hover:bg-accent/40">
      <td className="max-w-xs px-4 py-3">
        <Link href={`/admin/posts/${post.id}/edit`} className="font-medium text-foreground hover:underline">
          {post.title || "Untitled"}
        </Link>
        <p className="truncate text-xs text-muted-foreground">/{post.slug}</p>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{post.category?.name ?? "—"}</td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_VARIANT[post.status]}>{post.status}</Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {new Date(post.updated_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" asChild title="Edit">
            <Link href={`/admin/posts/${post.id}/edit`}>
              <Pencil className="size-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon-sm" asChild title="Preview">
            <Link href={`/journal/${post.slug}?preview=1`} target="_blank">
              <Eye className="size-4" />
            </Link>
          </Button>
          {post.status === "published" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Unpublish"
              disabled={pending}
              onClick={() => startTransition(() => unpublishAction(post.id))}
            >
              <EyeOff className="size-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Publish"
              disabled={pending}
              onClick={() => startTransition(() => publishAction(post.id))}
            >
              <Send className="size-4" />
            </Button>
          )}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Delete" className="hover:text-destructive">
                <Trash2 className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete &quot;{post.title}&quot;?</DialogTitle>
                <DialogDescription>
                  This permanently deletes the article and its tag links. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => startTransition(() => deleteAction(post.id))}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </td>
    </tr>
  );
}
