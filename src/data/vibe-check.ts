export const MOODS = [
  { key: "moody", label: "Moody", blurb: "quiet main-character energy. dim lights, good soundtrack, zero small talk." },
  { key: "flowy", label: "Flowy", blurb: "easy-breezy and in the zone. you glide through pages like they're a playlist." },
  { key: "deep", label: "Deep", blurb: "thoughtful and curious. you read the fine print on purpose." },
  { key: "playful", label: "Playful", blurb: "chaos, but make it cute. you're here to poke every single button." },
  { key: "edgy", label: "Edgy", blurb: "bold, sharp and a little rebellious. you came to judge the kerning." },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];
export type Ratings = Record<MoodKey, number>;

export const DEFAULT_RATINGS: Ratings = { moody: 5, flowy: 5, deep: 5, playful: 5, edgy: 5 };

export interface VibeMemoji {
  id: string;
  file: string;
  label: string;
}

// Memojis live in /public/images/vibe-check. Add a file + a label here to add one to the picker.
export const vibeMemojis: VibeMemoji[] = [
  { id: "1", file: "mood (1).png", label: "Whatever" },
  { id: "6", file: "mood (6).png", label: "Hmm" },
  { id: "7", file: "mood (7).png", label: "Shhh" },
  { id: "8", file: "mood (8).png", label: "Hopeful" },
  { id: "9", file: "mood (9).png", label: "Shook" },
  { id: "10", file: "mood (10).png", label: "Good vibes" },
  { id: "11", file: "mood (11).png", label: "Nope" },
  { id: "12", file: "mood (12).png", label: "Peace" },
  { id: "13", file: "mood (13).png", label: "Wow" },
  { id: "14", file: "mood (14).png", label: "Locked in" },
];

export const memojiSrc = (memoji: VibeMemoji) => `/images/vibe-check/${encodeURIComponent(memoji.file)}`;
