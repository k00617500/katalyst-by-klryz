"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Send, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publishAction } from "@/app/admin/(dashboard)/posts/actions";
import type { ScheduledPost } from "@/lib/cms/dashboard";

export function ScheduledPostsList({ posts }: { posts: ScheduledPost[] }) {
  const [pending, startTransition] = useTransition();

  if (posts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nothing scheduled — publish immediately or set a future date from the editor.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {posts.map((post) => (
        <div key={post.id} className="flex items-center justify-between gap-3 p-3 text-sm">
          <div className="min-w-0">
            <p className="truncate text-foreground">{post.title}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(post.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon-sm" asChild title="Edit">
              <Link href={`/admin/posts/${post.id}/edit`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Publish now"
              disabled={pending}
              onClick={() => startTransition(() => publishAction(post.id))}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
