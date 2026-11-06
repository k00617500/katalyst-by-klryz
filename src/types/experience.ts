export type ExperienceType =
  | "work"
  | "startup"
  | "organization"
  | "freelance";

export interface ExperienceEntry {
  id: string;
  type: ExperienceType;
  organization: string;
  position: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  responsibilities?: string[];
  location?: string;
}
