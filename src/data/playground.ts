export type PlaygroundCategory =
  | "photography"
  | "graphic-design"
  | "technical-experiments"
  | "ui-ux-explorations";

export interface PlaygroundItem {
  id: string;
  title: string;
  category: PlaygroundCategory;
  image: string;
  description?: string;
}

// TODO: Replace with real photography, design, and experiment uploads.
export const playgroundItems: PlaygroundItem[] = [];

export const playgroundCategoryLabels: Record<PlaygroundCategory, string> = {
  photography: "Photography",
  "graphic-design": "Graphic Design",
  "technical-experiments": "Technical Experiments",
  "ui-ux-explorations": "UI/UX Explorations",
};
