interface PlainTextNode {
  text?: string;
  content?: PlainTextNode[];
}

/** Flattens Tiptap JSON into plain text, for reading-time estimates and excerpts. */
export function tiptapToPlainText(node: PlainTextNode | null | undefined): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(tiptapToPlainText).join(" ");
  }
  return "";
}

export function estimateReadingTime(content: Record<string, unknown>): string {
  const words = tiptapToPlainText(content as PlainTextNode).trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} MIN READ`;
}
