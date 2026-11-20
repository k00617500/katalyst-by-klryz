import { NextResponse, type NextRequest } from "next/server";

// Cuts the background out of a Vibe Check selfie via remove.bg. The API key stays on the server (REMOVE_BG_API_KEY),
// the photo is streamed straight through and never stored.
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) for (const [key, times] of hits) if (!times.some((time) => now - time < WINDOW_MS)) hits.delete(key);
  return recent.length > MAX_PER_WINDOW;
}

async function callRemoveBg(apiKey: string, file: Blob, size: "auto" | "preview") {
  const body = new FormData();
  body.append("image_file", file, "selfie");
  body.append("size", size);
  body.append("format", "png");
  return fetch("https://api.remove.bg/v1.0/removebg", { method: "POST", headers: { "X-Api-Key": apiKey }, body });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Background removal isn't set up." }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "Slow down a little and try again in a minute." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof Blob) || !ALLOWED_TYPES.has(file.type) || file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Please use a JPG, PNG or WebP photo under 8 MB." }, { status: 400 });
  }

  try {
    let response = await callRemoveBg(apiKey, file, "auto");
    // Out of full-size credits: fall back to the free preview size.
    if (response.status === 402) response = await callRemoveBg(apiKey, file, "preview");
    if (!response.ok) return NextResponse.json({ error: "Couldn't cut out that photo." }, { status: 502 });
    return new NextResponse(await response.arrayBuffer(), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the background remover." }, { status: 502 });
  }
}
