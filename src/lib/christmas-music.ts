/**
 * Soft Christmas instrumentals, synthesised live with the Web Audio API (no audio files).
 *
 * The songs and their chord roadmaps come from the user's "Christmas Piano & Keyboard Songbook": each song is a simple
 * chord loop played as a gentle keyboard accompaniment (bass, broken chords or chord hits, plus a few bell sparkles) in
 * the feel the songbook suggests. Those are practice arrangements of the chords, not recordings or the songs' melodies.
 * "Deck the Halls", a traditional (public-domain) tune, is the one song that also carries its melody.
 * Filipino Christmas songs are picked more often than the rest.
 */
export interface Song {
  id: string;
  title: string;
  filipino: boolean;
  bpm: number;
  feel: "ballad" | "hymn" | "pop" | "swing" | "bounce";
  /** One entry per bar; two chords in a bar share it. */
  bars: string[][];
  /** Optional melody as [midi note, beats], covering the bars from the start. Songs without one play their chords only. */
  melody?: [number, number][];
}

export const SONGS: Song[] = [
  { id: "kumukutikutitap", title: "Kumukutikutitap", filipino: true, bpm: 126, feel: "pop", bars: [["C"], ["F"], ["G7"], ["C"]] },
  { id: "pasko-na-naman", title: "Pasko Na Naman", filipino: true, bpm: 116, feel: "bounce", bars: [["G"], ["C"], ["G"], ["D7"]] },
  { id: "sa-araw-ng-pasko", title: "Sa Araw ng Pasko", filipino: true, bpm: 84, feel: "ballad", bars: [["C"], ["G"], ["Am"], ["F"]] },
  { id: "christmas-in-our-hearts", title: "Christmas in Our Hearts", filipino: true, bpm: 72, feel: "ballad", bars: [["C"], ["G/B"], ["Am"], ["Em"], ["F"], ["C/E"], ["Dm7"], ["G7"]] },
  { id: "a-perfect-christmas", title: "A Perfect Christmas", filipino: false, bpm: 72, feel: "ballad", bars: [["F"], ["C/E"], ["Dm"], ["Am"], ["Bb"], ["F/A"], ["Gm7"], ["C7"]] },
  { id: "joy-to-the-world", title: "Joy to the World", filipino: false, bpm: 100, feel: "hymn", bars: [["D"], ["A"], ["D"], ["A7"], ["D"], ["G"], ["D/A", "A7"], ["D"]] },
  { id: "hark-the-herald", title: "Hark! The Herald Angels Sing", filipino: false, bpm: 96, feel: "hymn", bars: [["F"], ["C7"], ["F"], ["Bb"], ["F"], ["C7"], ["F/C", "C7"], ["F"]] },
  {
    // The traditional chorus (public domain) in G, so the notes are the real tune.
    id: "jingle-bells", title: "Jingle Bells", filipino: false, bpm: 120, feel: "bounce",
    bars: [["G"], ["G"], ["G"], ["G"], ["C"], ["C"], ["D7"], ["G"]],
    melody: [
      [71, 1], [71, 1], [71, 2], [71, 1], [71, 1], [71, 2], [71, 1], [74, 1], [67, 1.5], [69, 0.5], [71, 4],
      [72, 1], [72, 1], [72, 1.5], [72, 0.5], [72, 1], [71, 1], [71, 1], [71, 0.5], [71, 0.5], [74, 1], [74, 1], [72, 1], [69, 1], [67, 4],
    ],
  },
  { id: "rockin-around", title: "Rockin' Around the Christmas Tree", filipino: false, bpm: 132, feel: "swing", bars: [["G"], ["E7"], ["Am"], ["D7"]] },
  { id: "let-it-snow", title: "Let It Snow!", filipino: false, bpm: 96, feel: "swing", bars: [["C"], ["Am"], ["Dm"], ["G7"]] },
  { id: "beginning-to-look", title: "It's Beginning to Look a Lot Like Christmas", filipino: false, bpm: 100, feel: "swing", bars: [["F"], ["D7"], ["Gm"], ["C7"]] },
  { id: "all-i-want", title: "All I Want for Christmas Is You", filipino: false, bpm: 120, feel: "pop", bars: [["G"], ["Em"], ["C"], ["D"]] },
  { id: "last-christmas", title: "Last Christmas", filipino: false, bpm: 108, feel: "pop", bars: [["D"], ["Bm"], ["Em"], ["A"]] },
  {
    id: "deck-the-halls", title: "Deck the Halls", filipino: false, bpm: 112, feel: "ballad",
    bars: [["D"], ["D"], ["A"], ["D"], ["D"], ["G"], ["A"], ["D"]],
    melody: [
      [69, 1.5], [67, 0.5], [66, 1], [64, 1], [62, 1], [64, 1], [66, 1], [62, 1],
      [64, 0.5], [66, 0.5], [67, 0.5], [64, 0.5], [66, 1.5], [64, 0.5], [62, 1], [61, 1], [62, 2],
      [69, 1], [71, 1], [73, 1], [69, 1], [71, 1], [73, 1], [74, 1], [71, 1],
      [73, 0.5], [74, 0.5], [76, 0.5], [73, 0.5], [74, 1.5], [73, 0.5], [71, 1], [69, 1], [74, 2],
    ],
  },
];

/** A random song, Filipino ones three times as likely as the others, and never the one that just played. */
export function pickSong(previousId?: string): Song {
  const pool = SONGS.filter((song) => song.id !== previousId);
  const weights = pool.map((song) => (song.filipino ? 3 : 1));
  let roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[0];
}

const PITCH_CLASS: Record<string, number> = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const QUALITY: Record<string, number[]> = { "": [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 7, 10], m7: [0, 3, 7, 10] };

interface Chord { tones: number[]; root: number; bass: number }

/** "G/B" -> the notes of G above, with B in the bass. Right-hand notes sit around middle C, the bass an octave or two below. */
function parseChord(name: string): Chord {
  const match = /^([A-G][b#]?)(m7|m|7)?(?:\/([A-G][b#]?))?$/.exec(name);
  const rootPc = PITCH_CLASS[match?.[1] ?? "C"] ?? 0;
  const intervals = QUALITY[match?.[2] ?? ""] ?? QUALITY[""];
  const base = rootPc >= 7 ? 48 + rootPc : 60 + rootPc;
  const bassPc = match?.[3] ? PITCH_CLASS[match[3]] : rootPc;
  return { tones: intervals.map((step) => base + step), root: 36 + rootPc, bass: 36 + bassPc };
}

const midi = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

type Voice = "keys" | "bell" | "bass";

function note(ctx: AudioContext, out: AudioNode, when: number, pitch: number, length: number, level: number, voice: Voice) {
  const frequency = midi(pitch);
  const tail = Math.max(0.45, length * (voice === "bell" ? 1.8 : voice === "bass" ? 1.1 : 1.35));
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(level * 1.8, when + (voice === "bass" ? 0.012 : 0.006));
  gain.gain.exponentialRampToValueAtTime(0.0001, when + tail);
  gain.connect(out);
  const partials: [number, number, OscillatorType][] =
    voice === "bell" ? [[1, 1, "sine"], [2, 0.35, "sine"], [4.1, 0.1, "sine"]]
    : voice === "bass" ? [[1, 1, "triangle"], [2, 0.15, "sine"]]
    : [[1, 1, "sine"], [2, 0.3, "triangle"], [3, 0.08, "sine"]]; // a mellow electric-piano tone
  for (const [ratio, mix, type] of partials) {
    const oscillator = ctx.createOscillator();
    const partial = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency * ratio;
    partial.gain.value = mix;
    oscillator.connect(partial).connect(gain);
    oscillator.start(when);
    oscillator.stop(when + tail + 0.05);
  }
}

function sleighBell(ctx: AudioContext, out: AudioNode, when: number, level: number) {
  const length = 0.09;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 7200;
  filter.Q.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.value = level * 1.5;
  source.connect(filter).connect(gain).connect(out);
  source.start(when);
}

/** Plays one bar of a song starting at `start` seconds. */
function playBar(ctx: AudioContext, out: AudioNode, song: Song, bar: number, start: number) {
  const beat = 60 / song.bpm;
  const chords = song.bars[bar % song.bars.length].map(parseChord);
  const chordAt = (beatIndex: number) => chords[Math.min(chords.length - 1, Math.floor((beatIndex / 4) * chords.length))];
  const swing = song.feel === "swing" ? beat * 0.16 : 0;
  const t = (beats: number) => start + beats * beat;

  switch (song.feel) {
    case "ballad": {
      // Slow broken chords with a long bass note, like a piano ballad.
      for (let step = 0; step < 8; step++) {
        const chord = chordAt(step / 2);
        const tones = [chord.tones[0], chord.tones[1], chord.tones[2], chord.tones[0] + 12];
        const pitch = tones[[0, 1, 2, 3, 2, 1, 2, 1][step]];
        note(ctx, out, t(step / 2), pitch, beat, 0.075, "keys");
      }
      note(ctx, out, t(0), chordAt(0).bass, beat * 2, 0.1, "bass");
      note(ctx, out, t(2), chordAt(2).root + 7, beat * 2, 0.07, "bass");
      break;
    }
    case "hymn": {
      for (const beatIndex of [0, 2]) {
        const chord = chordAt(beatIndex);
        for (const tone of chord.tones) note(ctx, out, t(beatIndex), tone, beat * 2, 0.06, "keys");
        note(ctx, out, t(beatIndex), beatIndex === 0 ? chord.bass : chord.root + 7, beat * 2, 0.1, "bass");
      }
      note(ctx, out, t(0), chordAt(0).tones[chordAt(0).tones.length - 1] + 12, beat * 2, 0.05, "bell");
      break;
    }
    case "pop": {
      for (let step = 0; step < 8; step++) {
        const chord = chordAt(step / 2);
        if (step % 2 === 1) for (const tone of chord.tones.slice(0, 3)) note(ctx, out, t(step / 2), tone, beat * 0.6, 0.05, "keys");
        else note(ctx, out, t(step / 2), step % 4 === 2 ? chord.root + 7 : chord.bass, beat * 0.8, 0.095, "bass");
      }
      for (let b = 0; b < 4; b++) sleighBell(ctx, out, t(b), 0.025);
      note(ctx, out, t(0), chordAt(0).tones[2] + 12, beat * 2, 0.05, "bell");
      break;
    }
    case "swing": {
      const walk = (chord: Chord, index: number) => [chord.root, chord.root + (chord.tones[1] - chord.tones[0]), chord.root + 7, chord.root + (chord.tones[1] - chord.tones[0])][index];
      for (let b = 0; b < 4; b++) note(ctx, out, t(b), walk(chordAt(b), b), beat * 0.9, 0.095, "bass");
      for (const b of [1, 3]) {
        for (const tone of chordAt(b).tones) note(ctx, out, t(b) + swing, tone, beat * 0.45, 0.055, "keys");
      }
      note(ctx, out, t(0) + swing, chordAt(0).tones[2] + 12, beat * 1.5, 0.045, "bell");
      break;
    }
    case "bounce": {
      for (let b = 0; b < 4; b++) {
        const chord = chordAt(b);
        note(ctx, out, t(b), b % 2 === 0 ? chord.bass : chord.root + 7, beat * 0.7, 0.1, "bass");
        if (b % 2 === 1) for (const tone of chord.tones) note(ctx, out, t(b), tone, beat * 0.5, 0.06, "keys");
        sleighBell(ctx, out, t(b), 0.03);
        sleighBell(ctx, out, t(b + 0.5), 0.015);
      }
      note(ctx, out, t(0), chordAt(0).tones[2] + 12, beat * 1.5, 0.05, "bell");
      break;
    }
  }
}

export interface Playing { stop: () => void }

const BARS_PER_PLAY = 16;

/** Starts a song and calls `onEnd` when it has played through (about half a minute). */
export function playSong(ctx: AudioContext, song: Song, onEnd: () => void): Playing {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 0.6);
  const echo = ctx.createDelay(0.8);
  const beat = 60 / song.bpm;
  echo.delayTime.value = Math.min(0.75, beat * 0.75);
  const echoGain = ctx.createGain();
  echoGain.gain.value = 0.2;
  master.connect(ctx.destination);
  master.connect(echo).connect(echoGain).connect(ctx.destination);

  const barLength = beat * 4;
  const begin = ctx.currentTime + 0.15;
  let scheduled = 0;
  let stopped = false;
  let timer = 0;

  // The melody (if the song has one) as events in beats from the start, repeated to fill the whole play.
  const melody: { at: number; pitch: number; beats: number }[] = [];
  if (song.melody) {
    const loops = Math.ceil(BARS_PER_PLAY / song.bars.length);
    for (let loop = 0; loop < loops; loop++) {
      let at = loop * song.bars.length * 4;
      for (const [pitch, beats] of song.melody) {
        melody.push({ at, pitch, beats });
        at += beats;
      }
    }
  }

  // Notes are scheduled a couple of bars ahead rather than all at once.
  const pump = () => {
    if (stopped) return;
    while (scheduled < BARS_PER_PLAY && begin + scheduled * barLength < ctx.currentTime + 2.5 * barLength) {
      playBar(ctx, master, song, scheduled, begin + scheduled * barLength);
      for (const event of melody) {
        if (event.at >= scheduled * 4 && event.at < (scheduled + 1) * 4) note(ctx, master, begin + event.at * beat, event.pitch, event.beats * beat, 0.13, "bell");
      }
      scheduled++;
    }
    if (scheduled >= BARS_PER_PLAY) {
      timer = window.setTimeout(() => { if (!stopped) onEnd(); }, Math.max(0, (begin + BARS_PER_PLAY * barLength - ctx.currentTime + 1.5) * 1000));
      return;
    }
    timer = window.setTimeout(pump, 400);
  };
  pump();

  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      window.setTimeout(() => { try { master.disconnect(); echo.disconnect(); echoGain.disconnect(); } catch { /* already gone */ } }, 500);
    },
  };
}
