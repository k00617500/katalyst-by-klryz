export type MoodTone = "positive" | "negative";

export interface MoodOption {
  label: string;
  description: string;
  tone: MoodTone;
}

// Visitors pick between MIN_MOODS and MAX_MOODS of these; each picked mood becomes an axis on the chart.
export const MOOD_OPTIONS: MoodOption[] = [
  { label: "Happy", description: "Enjoying the overall experience", tone: "positive" },
  { label: "Impressed", description: "Amazed by the quality of work", tone: "positive" },
  { label: "Inspired", description: "Motivated by the projects or achievements", tone: "positive" },
  { label: "Curious", description: "Interested in learning more about the creator", tone: "positive" },
  { label: "Excited", description: "Enthusiastic about the showcased work", tone: "positive" },
  { label: "Interested", description: "Actively engaged with the content", tone: "positive" },
  { label: "Surprised", description: "Encountering something unexpected or impressive", tone: "positive" },
  { label: "Amazed", description: "Experiencing a strong positive impression", tone: "positive" },
  { label: "Confident", description: "Feels assured about the creator's capabilities", tone: "positive" },
  { label: "Trusting", description: "Developing trust in the creator's credibility", tone: "positive" },
  { label: "Admiring", description: "Appreciating the creativity and skills displayed", tone: "positive" },
  { label: "Motivated", description: "Encouraged to explore or take action", tone: "positive" },
  { label: "Engaged", description: "Actively paying attention to the portfolio", tone: "positive" },
  { label: "Confused", description: "Having difficulty understanding the content", tone: "negative" },
  { label: "Overwhelmed", description: "Finding too much information or visual content", tone: "negative" },
  { label: "Bored", description: "Losing interest while browsing", tone: "negative" },
  { label: "Skeptical", description: "Uncertain about the credibility or claims", tone: "negative" },
  { label: "Disappointed", description: "Finding something below expectations", tone: "negative" },
  { label: "Frustrated", description: "Experiencing difficulty navigating the website", tone: "negative" },
  { label: "Indifferent", description: "Showing little apparent interest in the experience", tone: "negative" },
];

export const MIN_MOODS = 3;
export const MAX_MOODS = 5;
export const MAX_RATING = 5;
export const DEFAULT_RATING = 3;

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
