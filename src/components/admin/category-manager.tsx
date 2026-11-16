"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  type CategoryFormState,
} from "@/app/admin/(dashboard)/categories/actions";

interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
}

export function CategoryManager({ initialCategories }: { initialCategories: CategoryWithCount[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [createState, createAction, createPending] = useActionState<CategoryFormState, FormData>(
    createCategoryAction,
    {},
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        action={(formData) => {
          createAction(formData);
        }}
        className="space-y-3 rounded-lg border border-border p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Product Updates" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug (optional)</Label>
            <Input id="slug" name="slug" placeholder="auto-generated from name" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description (optional)</Label>
          <Input id="description" name="description" />
        </div>
        {createState.error && <p className="text-sm text-destructive">{createState.error}</p>}
        <Button type="submit" size="sm" disabled={createPending}>
          {createPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add category
        </Button>
      </form>

      <div className="divide-y divide-border rounded-lg border border-border">
        {categories.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No categories yet.</p>
        )}
        {categories.map((category) =>
          editingId === category.id ? (
            <EditRow
              key={category.id}
              category={category}
              onDone={(updated) => {
                setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, ...updated } : c)));
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={category.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  /{category.slug} · {category.postCount} {category.postCount === 1 ? "article" : "articles"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(category.id)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:text-destructive"
                  onClick={() => {
                    if (window.confirm(`Delete "${category.name}"? Articles keep their content but lose this category.`)) {
                      startTransition(async () => {
                        await deleteCategoryAction(category.id);
                        setCategories((prev) => prev.filter((c) => c.id !== category.id));
                      });
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function EditRow({
  category,
  onDone,
  onCancel,
}: {
  category: CategoryWithCount;
  onDone: (updated: Partial<CategoryWithCount>) => void;
  onCancel: () => void;
}) {
  const boundAction = updateCategoryAction.bind(null, category.id);
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(boundAction, {});
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);

  return (
    <form
      action={async (formData) => {
        await action(formData);
        if (!state.error) onDone({ name, slug });
      }}
      className="flex items-center gap-2 p-4"
    >
      <Input name="name" value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
      <Input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="h-8" />
      <input type="hidden" name="description" value={category.description ?? ""} />
      <Button type="submit" size="sm" disabled={pending}>
        Save
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
