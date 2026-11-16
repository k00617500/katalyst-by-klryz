"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTagAction, deleteTagAction, renameTagAction, type TagFormState } from "@/app/admin/(dashboard)/tags/actions";

interface TagWithCount {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

export function TagManager({ initialTags }: { initialTags: TagWithCount[] }) {
  const [tags, setTags] = useState(initialTags);
  const [state, action, pending] = useActionState<TagFormState, FormData>(createTagAction, {});
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form action={action} className="flex gap-2">
        <Input name="name" placeholder="New tag name" required />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </form>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-foreground"
          >
            <input
              defaultValue={tag.name}
              className="w-auto min-w-6 max-w-32 bg-transparent outline-none"
              size={Math.max(tag.name.length, 3)}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== tag.name) {
                  startTransition(async () => {
                    await renameTagAction(tag.id, value);
                    setTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, name: value } : t)));
                  });
                }
              }}
            />
            <span className="text-xs text-muted-foreground">{tag.postCount}</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (window.confirm(`Delete tag "${tag.name}"?`)) {
                  startTransition(async () => {
                    await deleteTagAction(tag.id);
                    setTags((prev) => prev.filter((t) => t.id !== tag.id));
                  });
                }
              }}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
