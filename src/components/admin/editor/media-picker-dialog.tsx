"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaGrid } from "@/components/admin/media-grid";
import type { MediaRow } from "@/types/database";

export function MediaPickerDialog({
  open,
  onOpenChange,
  media,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: MediaRow[];
  onSelect: (media: MediaRow) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose an image</DialogTitle>
        </DialogHeader>
        <MediaGrid
          initialMedia={media}
          mode="picker"
          onSelect={(m) => {
            onSelect(m);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
