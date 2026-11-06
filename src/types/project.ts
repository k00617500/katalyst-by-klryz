export type ProjectCategory =
  | "web-development"
  | "mobile-applications"
  | "ui-ux-design"
  | "startup-entrepreneurship"
  | "research-innovation"
  | "creative-design";

export interface ProjectCaseStudySection {
  background?: string;
  problemStatement?: string;
  proposedSolution?: string;
  objectives?: string[];
  role?: string;
  team?: string[];
  researchAndPlanning?: string;
  designProcess?: string;
  developmentProcess?: string;
  challenges?: string;
  results?: string;
  lessonsLearned?: string;
}

export interface Project {
  slug: string;
  title: string;
  shortDescription: string;
  categories: ProjectCategory[];
  year: number;
  featured: boolean;
  technologies: string[];
  thumbnail: string;
  gallery?: string[];
  liveUrl?: string;
  githubUrl?: string;
  overview: string;
  caseStudy?: ProjectCaseStudySection;
  relatedSlugs?: string[];
}
