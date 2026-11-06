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

const photoIndices = [
  ...Array.from({ length: 20 }, (_, i) => ({ index: i + 1, ext: "jpg" })),
  { index: 21, ext: "png" },
];

export const playgroundItems: PlaygroundItem[] = photoIndices.map(({ index, ext }) => ({
  id: `playground-${index}`,
  title: `Street Photography ${String(index).padStart(2, "0")}`,
  category: "photography",
  image: `/images/playground/plygrnd (${index}).${ext}`,
}));

export const playgroundCategoryLabels: Record<PlaygroundCategory, string> = {
  photography: "Photography",
  "graphic-design": "Graphic Design",
  "technical-experiments": "Technical Experiments",
  "ui-ux-explorations": "UI/UX Explorations",
};
