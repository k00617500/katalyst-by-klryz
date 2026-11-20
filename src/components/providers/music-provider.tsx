"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { MiniPlayer } from "@/components/layout/mini-player";
import { useSound } from "@/components/providers/sound-provider";
import { createToolkitSong, toolkitSongs, type ToolkitSong } from "@/data/toolkit-songs";

export interface SpotifyPlaybackState {
  playingURI: string;
  isBuffering: boolean;
  isPaused: boolean;
  position: number;
  duration: number;
}

export interface SpotifyEmbedController {
  play: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  seek: (seconds: number) => void;
  loadUri: (uri: string) => void;
  addListener(event: "ready", callback: () => void): void;
  addListener(event: "playback_started", callback: (event: { data: { playingURI: string } }) => void): void;
  addListener(event: "playback_update", callback: (event: { data: SpotifyPlaybackState }) => void): void;
  destroy: () => void;
}

export interface SpotifyIframeApi {
  createController: (
    element: HTMLElement,
    options: ({ uri: string } | { url: string }) & { width?: string | number; height?: string | number },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: SpotifyIframeApi) => void;
  }
}

const TRACK_END_WINDOW_MS = 1200;
// Give a slow-starting embed a chance before retrying from the compact player.
const PLAYBACK_START_TIMEOUT_MS = 6500;
// Spotify previews report progress roughly once a second in the foreground. A few added seconds of
// slack here avoids flipping to "paused" during brief background-tab throttling.
const STALL_WATCHDOG_MS = 3600;
let spotifyApi: SpotifyIframeApi | undefined;

export function createShuffleOrder(songCount: number) {
  const order = Array.from({ length: songCount }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

/** Lets the Toolkit section react to the shared player (tile flashes, beat sync) without owning it. */
export interface MusicHooks {
  onSongLoad?: () => void;
  onSeek?: () => void;
  onStop?: () => void;
}

interface MusicContextValue {
  songs: ToolkitSong[];
  song: ToolkitSong;
  currentSongIndex: number;
  isPlaying: boolean;
  /** True once the visitor has pressed play, so the floating player knows to appear. */
  started: boolean;
  /** Whether the floating player is tucked into its navbar tab (shared so the navbar can reserve the spot). */
  miniCollapsed: boolean;
  setMiniCollapsed: (collapsed: boolean) => void;
  positionMs: number;
  durationMs: number;
  loop: boolean;
  shuffle: boolean;
  playlistApi: SpotifyIframeApi | undefined;
  togglePlay: () => void;
  skipSong: (direction: 1 | -1) => void;
  seekToRatio: (ratio: number) => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  pickSong: (index: number) => void;
  pickSpotifyTrack: (id: string) => void;
  /** The Toolkit player panel registers whether it is on screen; the floating player hides while it is. */
  setPanelVisible: (visible: boolean) => void;
  hooksRef: MutableRefObject<MusicHooks>;
  lastPlaybackRef: MutableRefObject<SpotifyPlaybackState | null>;
  playingRef: MutableRefObject<boolean>;
  playRequestedRef: MutableRefObject<boolean>;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusic() {
  const value = useContext(MusicContext);
  if (!value) throw new Error("useMusic must be used inside <MusicProvider>");
  return value;
}

/**
 * Owns the one Spotify embed for the whole site, so a song keeps playing while visitors move between pages.
 * The embed lives in a hidden-but-rendered container; the Toolkit panel and the floating mini player are just views.
 */
export function MusicProvider({ children }: { children: React.ReactNode }) {
  // The navbar sound switch is the master switch: muting it silences the Toolkit music too.
  const { enabled: soundEnabled, toggle: toggleSound } = useSound();
  const soundEnabledRef = useRef(soundEnabled);
  const resumeAfterUnmute = useRef(false);
  const [songs, setSongs] = useState(toolkitSongs);
  const [playlistApi, setPlaylistApi] = useState<SpotifyIframeApi>();
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [miniCollapsed, setMiniCollapsedState] = useState(false);
  useEffect(() => {
    try { setMiniCollapsedState(window.localStorage.getItem("katalyst-mini-player-collapsed") === "1"); } catch { /* storage can be unavailable */ }
  }, []);
  const setMiniCollapsed = useCallback((collapsed: boolean) => {
    setMiniCollapsedState(collapsed);
    try { window.localStorage.setItem("katalyst-mini-player-collapsed", collapsed ? "1" : "0"); } catch { /* storage can be unavailable */ }
  }, []);

  const controllerRef = useRef<SpotifyEmbedController | null>(null);
  const embedContainerRef = useRef<HTMLDivElement | null>(null);
  const stallWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlaybackRef = useRef<SpotifyPlaybackState | null>(null);
  const playingRef = useRef(false);
  const readyRef = useRef(false);
  const playRequestedRef = useRef(false);
  const hooksRef = useRef<MusicHooks>({});

  const songIndexRef = useRef(0);
  const songsRef = useRef(toolkitSongs);
  const loopRef = useRef(false);
  const shuffleOrderRef = useRef<number[] | null>(null);

  const updatePlaying = useCallback((playing: boolean) => {
    playingRef.current = playing;
    setIsPlaying(playing);
    if (!playing) hooksRef.current.onStop?.();
  }, []);

  const resetPlayback = useCallback(() => {
    lastPlaybackRef.current = null;
    if (stallWatchdogRef.current) clearTimeout(stallWatchdogRef.current);
    if (playbackStartTimeoutRef.current) clearTimeout(playbackStartTimeoutRef.current);
    updatePlaying(false);
  }, [updatePlaying]);

  const requestPlayback = useCallback(() => {
    resetPlayback();
    playRequestedRef.current = true;
    setStarted(true);
    playbackStartTimeoutRef.current = setTimeout(() => {
      if (playRequestedRef.current && readyRef.current) controllerRef.current?.resume();
    }, PLAYBACK_START_TIMEOUT_MS);
  }, [resetPlayback]);

  const loadSong = useCallback((index: number) => {
    if (!soundEnabledRef.current) { resumeAfterUnmute.current = false; toggleSound(); }
    const previousUri = songsRef.current[songIndexRef.current].uri;
    const { uri } = songsRef.current[index];
    songIndexRef.current = index;
    hooksRef.current.onSongLoad?.();
    requestPlayback();
    setCurrentSongIndex(index);
    setPositionMs(0);

    const controller = controllerRef.current;
    if (!controller) return;
    if (uri !== previousUri) {
      readyRef.current = false;
      setDurationMs(0);
      controller.loadUri(uri);
    } else if (readyRef.current) {
      controller.restart();
    }
  }, [requestPlayback, toggleSound]);

  const skipSong = useCallback((direction: 1 | -1) => {
    const order = shuffleOrderRef.current;
    const index = songIndexRef.current;
    const position = order ? order.indexOf(index) : index;
    const songCount = songsRef.current.length;
    const next = (position + direction + songCount) % songCount;
    loadSong(order ? order[next] : next);
  }, [loadSong]);

  const onTrackEnded = useCallback(() => {
    if (loopRef.current) loadSong(songIndexRef.current);
    else skipSong(1);
  }, [loadSong, skipSong]);

  useEffect(() => {
    let cancelled = false;
    const container = embedContainerRef.current;
    if (!container) return;

    const initialize = (api: SpotifyIframeApi) => {
      if (cancelled) return;
      spotifyApi = api;
      setPlaylistApi(api);
      const target = document.createElement("div");
      container.replaceChildren(target);
      const initialUri = songsRef.current[songIndexRef.current].uri;
      api.createController(
        target,
        { uri: initialUri, width: "100%", height: 152 },
        (controller) => {
          if (cancelled) { controller.destroy(); return; }
          controllerRef.current = controller;
          const iframe = container.querySelector("iframe");
          if (iframe) {
            iframe.title = "Toolkit Spotify player";
            iframe.loading = "eager";
          }
          const trackProgress = () => {
            updatePlaying(true);
            if (stallWatchdogRef.current) clearTimeout(stallWatchdogRef.current);
            stallWatchdogRef.current = setTimeout(() => updatePlaying(false), STALL_WATCHDOG_MS);
          };
          controller.addListener("ready", () => {
            if (cancelled) return;
            readyRef.current = true;
            if (playRequestedRef.current) controller.play();
          });
          controller.addListener("playback_started", ({ data }) => {
            if (cancelled || !playRequestedRef.current || data.playingURI !== songsRef.current[songIndexRef.current].uri) return;
            trackProgress();
          });
          controller.addListener("playback_update", ({ data }) => {
            const { playingURI, isPaused, isBuffering, position, duration } = data;
            if (cancelled || playingURI !== songsRef.current[songIndexRef.current].uri) return;
            const previous = lastPlaybackRef.current;
            lastPlaybackRef.current = data;
            setPositionMs(position);
            setDurationMs(duration);

            // A preview can stop at its duration while still reporting isPaused: false.
            const finishedTrack =
              playRequestedRef.current && !isBuffering && previous && !previous.isPaused && duration > 0 &&
              ((position >= duration && previous.position < duration) ||
                (isPaused && (position >= duration - 250 ||
                  (position === 0 && previous.position >= duration - TRACK_END_WINDOW_MS))));
            if (finishedTrack) {
              onTrackEnded();
              return;
            }

            if (!playRequestedRef.current || isPaused || isBuffering ||
                (duration > 0 && position >= duration)) {
              if (stallWatchdogRef.current) clearTimeout(stallWatchdogRef.current);
              updatePlaying(false);
              return;
            }
            if (position <= (previous?.position ?? 0)) return;

            if (playbackStartTimeoutRef.current) clearTimeout(playbackStartTimeoutRef.current);
            trackProgress();
          });
          const selectedUri = songsRef.current[songIndexRef.current].uri;
          if (selectedUri !== initialUri) controller.loadUri(selectedUri);
        },
      );
    };
    let script: HTMLScriptElement | undefined;
    if (spotifyApi) initialize(spotifyApi);
    else {
      window.onSpotifyIframeApiReady = initialize;
      script = document.createElement("script");
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.async = true;
      document.body.appendChild(script);
    }
    return () => {
      cancelled = true;
      readyRef.current = false;
      controllerRef.current?.destroy();
      controllerRef.current = null;
      if (stallWatchdogRef.current) clearTimeout(stallWatchdogRef.current);
      if (playbackStartTimeoutRef.current) clearTimeout(playbackStartTimeoutRef.current);
      if (window.onSpotifyIframeApiReady === initialize) delete window.onSpotifyIframeApiReady;
      script?.remove();
    };
  }, [onTrackEnded, updatePlaying]);

  // Keep the catalog in lock-step with the live Spotify playlist (new songs, removals, cover art).
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const response = await fetch("/api/toolkit-songs", { cache: "no-store" });
        if (!response.ok) return;
        const { songs: live } = (await response.json()) as { songs?: Array<{ id: string; title: string; artist: string; cover: string }> };
        if (cancelled || !live?.length) return;
        const known = new Map(songsRef.current.map((entry) => [entry.id, entry]));
        const next = live.map((entry) => createToolkitSong({ ...entry, cover: entry.cover || known.get(entry.id)?.cover || "" }));
        const current = songsRef.current[songIndexRef.current];
        // Until the visitor starts something, the display shows the playlist's current first track.
        const untouched = !playRequestedRef.current && !playingRef.current && !lastPlaybackRef.current;
        let index = untouched ? 0 : next.findIndex((entry) => entry.id === current.id);
        if (index === -1) { next.push(current); index = next.length - 1; }
        songsRef.current = next;
        songIndexRef.current = index;
        if (shuffleOrderRef.current) shuffleOrderRef.current = createShuffleOrder(next.length);
        setSongs(next);
        setCurrentSongIndex(index);
      } catch { /* keep the current list */ }
    };
    void sync();
    const timer = setInterval(sync, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const startPlayback = useCallback(() => {
    const controller = controllerRef.current;
    const position = lastPlaybackRef.current?.position ?? 0;
    requestPlayback();
    if (controller && readyRef.current) {
      if (position > 0) controller.resume();
      else controller.play();
    }
  }, [requestPlayback]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) {
      playRequestedRef.current = false;
      resetPlayback();
      controllerRef.current?.pause();
      return;
    }
    if (!soundEnabledRef.current) { resumeAfterUnmute.current = false; toggleSound(); }
    startPlayback();
  }, [resetPlayback, startPlayback, toggleSound]);

  // Sound switched off in the navbar: pause the music. Switched back on: pick up where it left off.
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    if (!soundEnabled) {
      if (playingRef.current || playRequestedRef.current) {
        resumeAfterUnmute.current = true;
        playRequestedRef.current = false;
        resetPlayback();
        controllerRef.current?.pause();
      }
    } else if (resumeAfterUnmute.current) {
      resumeAfterUnmute.current = false;
      startPlayback();
    }
  }, [soundEnabled, resetPlayback, startPlayback]);

  const seekToRatio = useCallback((ratio: number) => {
    const controller = controllerRef.current;
    if (!controller || !durationMs) return;
    resetPlayback();
    hooksRef.current.onSeek?.();
    controller.seek((Math.min(1, Math.max(0, ratio)) * durationMs) / 1000);
  }, [durationMs, resetPlayback]);

  const toggleLoop = useCallback(() => {
    loopRef.current = !loopRef.current;
    setLoop(loopRef.current);
  }, []);

  const toggleShuffle = useCallback(() => {
    shuffleOrderRef.current = shuffleOrderRef.current ? null : createShuffleOrder(songsRef.current.length);
    setShuffle(shuffleOrderRef.current !== null);
  }, []);

  const pickSong = useCallback((index: number) => loadSong(index), [loadSong]);

  const pickSpotifyTrack = useCallback((id: string) => {
    const knownIndex = songsRef.current.findIndex((entry) => entry.id === id);
    if (knownIndex !== -1) {
      loadSong(knownIndex);
      return;
    }

    // The live playlist can include tracks beyond the site's searchable catalog.
    const index = songsRef.current.length;
    const track = createToolkitSong({ id, title: "Spotify track", artist: "Spotify", cover: "" });
    songsRef.current = [...songsRef.current, track];
    shuffleOrderRef.current?.push(index);
    setSongs(songsRef.current);
    loadSong(index);

    const url = encodeURIComponent(`https://open.spotify.com/track/${id}`);
    void fetch(`https://open.spotify.com/oembed?url=${url}`)
      .then((response) => response.ok ? response.json() : null)
      .then((metadata: { title?: string; thumbnail_url?: string } | null) => {
        const title = metadata?.title;
        if (!title) return;
        const thumbnail = metadata?.thumbnail_url;
        const cover = thumbnail && /^https:\/\/[\w.-]+\.(scdn\.co|spotifycdn\.com)\//.test(thumbnail) ? thumbnail : "";
        songsRef.current = songsRef.current.map((entry) => entry.id === id ? { ...entry, title, cover } : entry);
        setSongs(songsRef.current);
      })
      .catch(() => { /* Playback can continue when artwork and title are unavailable. */ });
  }, [loadSong]);

  const song = songs[currentSongIndex] ?? songs[0];

  // Hardware / browser media keys and the browser's media hub, where the page is allowed to set them.
  useEffect(() => {
    if (!started || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        artwork: song.cover ? [{ src: song.cover, sizes: "300x300", type: "image/jpeg" }] : [],
      });
      navigator.mediaSession.setActionHandler("play", togglePlay);
      navigator.mediaSession.setActionHandler("pause", togglePlay);
      navigator.mediaSession.setActionHandler("previoustrack", () => skipSong(-1));
      navigator.mediaSession.setActionHandler("nexttrack", () => skipSong(1));
    } catch { /* Media Session isn't available everywhere. */ }
  }, [started, song.title, song.artist, song.cover, togglePlay, skipSong]);

  const value = useMemo<MusicContextValue>(() => ({
    songs, song, currentSongIndex, isPlaying, started, miniCollapsed, setMiniCollapsed, positionMs, durationMs, loop, shuffle, playlistApi,
    togglePlay, skipSong, seekToRatio, toggleLoop, toggleShuffle, pickSong, pickSpotifyTrack, setPanelVisible,
    hooksRef, lastPlaybackRef, playingRef, playRequestedRef,
  }), [songs, song, currentSongIndex, isPlaying, started, miniCollapsed, setMiniCollapsed, positionMs, durationMs, loop, shuffle, playlistApi,
    togglePlay, skipSong, seekToRatio, toggleLoop, toggleShuffle, pickSong, pickSpotifyTrack]);

  return (
    <MusicContext.Provider value={value}>
      {children}
      {/* The one embed for the whole site. Rendered (so it keeps playing) but invisible and out of the way. */}
      <div inert aria-hidden className="pointer-events-none fixed right-0 bottom-0 -z-10 h-[152px] w-[320px] overflow-hidden opacity-0">
        <div ref={embedContainerRef} className="[&>iframe]:block [&>iframe]:border-0" />
      </div>
      <MiniPlayer visible={started && !panelVisible} />
    </MusicContext.Provider>
  );
}
