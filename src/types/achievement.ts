export type AchievementCategory =
  | "academic"
  | "startup-innovation"
  | "competition"
  | "certification";

export interface Achievement {
  id: string;
  title: string;
  organization?: string;
  category: AchievementCategory;
  year?: number;
  dateLabel?: string;
  description?: string;
  certificateImage?: string;
}
