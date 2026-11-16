import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MediaRow } from "@/types/database";

const BUCKET = "media";

export async function listMedia(search?: string): Promise<MediaRow[]> {
  const supabase = await createClient();
  let query = supabase.from("media").select("*").order("created_at", { ascending: false });
  if (search) query = query.ilike("file_name", `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export { getPublicMediaUrl } from "@/lib/cms/media-url";

export async function uploadMediaFile(
  file: File,
  { width, height, uploadedBy }: { width?: number; height?: number; uploadedBy: string },
): Promise<MediaRow> {
  const supabase = await createClient();
  const extension = file.name.split(".").pop() ?? "bin";
  const storagePath = `${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("media")
    .insert({
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      width: width ?? null,
      height: height ?? null,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MediaRow;
}

export async function updateMediaAltText(id: string, altText: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("media").update({ alt_text: altText }).eq("id", id);
  if (error) throw error;
}

export async function deleteMediaFile(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: row, error: fetchError } = await supabase
    .from("media")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) throw error;
}
