"use client";

import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Unpublished" },
];

export function PostsFilterBar({ initial }: { initial: { status?: string; search?: string; sort?: string } }) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams();
    if (initial.status) params.set("status", initial.status);
    if (initial.search) params.set("search", initial.search);
    if (initial.sort) params.set("sort", initial.sort);

    if (value && value !== "all") params.set(key, value);
    else params.delete(key);

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search by title..."
        defaultValue={initial.search}
        className="max-w-xs"
        onChange={(e) => updateParam("search", e.target.value)}
      />
      <Select defaultValue={initial.status ?? "all"} onValueChange={(v) => updateParam("status", v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select defaultValue={initial.sort ?? "newest"} onValueChange={(v) => updateParam("sort", v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
          <SelectItem value="title">Title A-Z</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
