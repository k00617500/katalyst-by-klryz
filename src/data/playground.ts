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

export const playgroundCategoryLabels: Record<PlaygroundCategory, string> = {
  photography: "Photography",
  "graphic-design": "Graphic Design",
  "technical-experiments": "Technical Experiments",
  "ui-ux-explorations": "UI/UX Explorations",
};
