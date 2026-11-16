const BUCKET = "media";

/** Pure URL builder — safe to import from client components (no secrets, just the public URL). */
export function getPublicMediaUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}
