/**
 * Hand-written types for the CMS tables (supabase/migrations/0007-0009).
 * Regenerate with the Supabase CLI (`supabase gen types typescript`) once the
 * project is linked, and replace this file with the generated output.
 */

export type PostStatus = "draft" | "scheduled" | "published" | "unpublished";

export interface PostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: Record<string, unknown>;
  cover_image: string | null;
  cover_image_alt: string | null;
  author_id: string | null;
  category_id: string | null;
  status: PostStatus;
  published_at: string | null;
  scheduled_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  social_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface TagRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface PostTagRow {
  post_id: string;
  tag_id: string;
}

export interface ProfileRow {
  id: string;
  display_name: string;
  role: "admin";
  avatar_url: string | null;
  created_at: string;
}

export interface MediaRow {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface PostViewRow {
  id: string;
  post_id: string;
  viewed_at: string;
}

export interface AnalyticsEventRow {
  id: string;
  event_name: string;
  path: string | null;
  referrer: string | null;
  device_category: "desktop" | "mobile" | "tablet" | null;
  session_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      posts: { Row: PostRow; Insert: Partial<PostRow>; Update: Partial<PostRow> };
      categories: { Row: CategoryRow; Insert: Partial<CategoryRow>; Update: Partial<CategoryRow> };
      tags: { Row: TagRow; Insert: Partial<TagRow>; Update: Partial<TagRow> };
      post_tags: { Row: PostTagRow; Insert: PostTagRow; Update: Partial<PostTagRow> };
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow>; Update: Partial<ProfileRow> };
      media: { Row: MediaRow; Insert: Partial<MediaRow>; Update: Partial<MediaRow> };
      post_views: { Row: PostViewRow; Insert: Partial<PostViewRow>; Update: Partial<PostViewRow> };
      analytics_events: {
        Row: AnalyticsEventRow;
        Insert: Partial<AnalyticsEventRow>;
        Update: Partial<AnalyticsEventRow>;
      };
    };
  };
}
