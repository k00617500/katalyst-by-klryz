export type ExperienceType =
  | "work"
  | "startup"
  | "organization"
  | "freelance"
  | "research";

export interface ExperienceEntry {
  id: string;
  type: ExperienceType;
  organization: string;
  website?: string;
  position: string;
  startDate?: string;
  dateLabel?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  responsibilities?: string[];
  location?: string;
  skills?: string[];
}
