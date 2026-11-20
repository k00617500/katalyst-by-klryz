import { NextResponse, type NextRequest } from "next/server";

// Finds the head of the main subject in a Vibe Check photo with Gemini, so only the head gets cut out.
// The key stays on the server (GEMINI_API_KEY) and the photo is never stored.
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);
// Tried in order; Gemini models are sometimes busy, so each gets a short timeout. The client never waits long for this.
const MODELS = ["gemini-3.8-flash", "gemini-flash-latest"];
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

const PROMPT =
  "Find the head of the single main subject in this photo: face plus hair or head covering, down to the chin, " +
  "without neck, shoulders or the rest of the body. Reply with JSON only: {\"box_2d\":[ymin,xmin,ymax,xmax]} using integers " +
  "from 0 to 1000 relative to the image size. If there is no clear subject, reply {\"box_2d\":null}.";

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) for (const [key, times] of hits) if (!times.some((time) => now - time < WINDOW_MS)) hits.delete(key);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[detect-head] GEMINI_API_KEY is not set");
    return NextResponse.json({ box: null });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "Slow down a little and try again in a minute." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof Blob) || !ALLOWED_TYPES.has(file.type) || file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Please use a JPG, PNG or WebP photo." }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const body = JSON.stringify({
    contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: file.type, data } }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  });

  // Gemini is often busy, so ask every model at the same time and take the first valid box.
  const ask = async (model: string) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
      body,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const payload = await response.json();
    const text: string | undefined = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    const box = text ? JSON.parse(text)?.box_2d : null;
    const valid =
      Array.isArray(box) && box.length === 4 && box.every((value) => Number.isFinite(value) && value >= 0 && value <= 1000) &&
      box[2] > box[0] && box[3] > box[1];
    if (!valid) throw new Error("no box");
    return box as number[];
  };
  try {
    return NextResponse.json({ box: await Promise.any(MODELS.map(ask)) });
  } catch {
    // Detection is a nicety: without it the client falls back to a head-first crop of the cut-out.
    return NextResponse.json({ box: null });
  }
}
