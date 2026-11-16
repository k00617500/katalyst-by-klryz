"use server";

import { verifyAdminSession } from "@/lib/auth/dal";
import { deleteMediaFile, updateMediaAltText, uploadMediaFile } from "@/lib/cms/media";
import type { MediaRow } from "@/types/database";

export interface UploadState {
  error?: string;
  media?: MediaRow;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024;

export async function uploadMediaAction(_state: UploadState, formData: FormData): Promise<UploadState> {
  const { profile, user } = await verifyAdminSession();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only JPG, PNG, WEBP, and GIF images are supported." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "Images must be smaller than 10 MB." };
  }

  const width = Number(formData.get("width")) || undefined;
  const height = Number(formData.get("height")) || undefined;

  try {
    const media = await uploadMediaFile(file, { width, height, uploadedBy: profile?.id ?? user.id });
    return { media };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Upload failed." };
  }
}

export async function updateAltTextAction(id: string, altText: string) {
  await verifyAdminSession();
  await updateMediaAltText(id, altText);
}

export async function deleteMediaAction(id: string) {
  await verifyAdminSession();
  await deleteMediaFile(id);
}
