import { NextResponse } from "next/server";
import { toolkitSongs } from "@/data/toolkit-songs";

// Live view of the Spotify playlist: titles/artists from the public embed page, and album art per track from
// Spotify's oEmbed endpoint. Both are cached briefly so edits to the playlist appear within about a minute.
const PLAYLIST_ID = "37i9dQZF1DXe3Jzj3uus9u";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; KatalystToolkit/1.0)" };

interface EmbedTrack { uri?: string; title?: string; subtitle?: string }

async function fetchCover(id: string): Promise<string> {
  try {
    const response = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`,
      { headers: HEADERS, next: { revalidate: 60 * 60 * 24 } },
    );
    if (!response.ok) return "";
    const { thumbnail_url } = (await response.json()) as { thumbnail_url?: string };
    return typeof thumbnail_url === "string" && /^https:\/\/[\w.-]+\.(scdn\.co|spotifycdn\.com)\//.test(thumbnail_url)
      ? thumbnail_url
      : "";
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    const page = await fetch(`https://open.spotify.com/embed/playlist/${PLAYLIST_ID}`, {
      headers: HEADERS,
      next: { revalidate: 30 },
    });
    if (!page.ok) throw new Error(`embed ${page.status}`);
    const html = await page.text();
    const raw = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
    if (!raw) throw new Error("no data");
    const tracks: EmbedTrack[] = JSON.parse(raw).props.pageProps.state.data.entity.trackList ?? [];

    const base = tracks.flatMap((track) => {
      const id = /^spotify:track:([a-zA-Z0-9]{22})$/.exec(track.uri ?? "")?.[1];
      return id && track.title ? [{ id, title: track.title, artist: track.subtitle ?? "" }] : [];
    });

    // Covers we already know come straight from the built-in list; only new tracks need an oEmbed lookup, so the
    // response is fast instead of waiting on a hundred Spotify requests.
    const known = new Map(toolkitSongs.map((song) => [song.id, song.cover]));
    const songs = await Promise.all(base.map(async (song) => ({ ...song, cover: known.get(song.id) || (await fetchCover(song.id)) })));
    return NextResponse.json({ songs }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
