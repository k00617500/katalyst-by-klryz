export const nameTags = ["rose", "blue", "spectrum"] as const;
export type NameTag = (typeof nameTags)[number];

export function isNameTag(value: unknown): value is NameTag {
  return nameTags.some((tag) => tag === value);
}
