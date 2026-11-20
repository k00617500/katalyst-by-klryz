/**
 * "Deck the Halls" as a soft music-box instrumental, synthesised live with the Web Audio API (no audio file).
 * The tune is a traditional Welsh melody (Nos Galan) and in the public domain; this is a simple arrangement of it in
 * D major: the melody on a bell-like voice over a gentle arpeggiated accompaniment, looping until stopped.
 */
const BPM = 112;
const BEAT = 60 / BPM;

const midi = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

// [midi note, length in beats]. Eight bars of 4/4.
const MELODY: [number, number][] = [
  // Deck the halls with boughs of holly
  [69, 1.5], [67, 0.5], [66, 1], [64, 1],
  [62, 1], [64, 1], [66, 1], [62, 1],
  // Fa la la la la, la la la la
  [64, 0.5], [66, 0.5], [67, 0.5], [64, 0.5], [66, 1.5], [64, 0.5],
  [62, 1], [61, 1], [62, 2],
  // Don we now our gay apparel
  [69, 1], [71, 1], [73, 1], [69, 1],
  [71, 1], [73, 1], [74, 1], [71, 1],
  // Fa la la la la, la la la la
  [73, 0.5], [74, 0.5], [76, 0.5], [73, 0.5], [74, 1.5], [73, 0.5],
  [71, 1], [69, 1], [74, 2],
];

// One chord per bar (root, third, fifth as MIDI notes in a low octave), played as a gentle arpeggio.
const CHORDS: number[][] = [
  [50, 54, 57], [50, 54, 57], [45, 49, 52], [50, 54, 57],
  [50, 54, 57], [43, 47, 50], [45, 49, 52], [50, 54, 57],
];

function bell(ctx: AudioContext, out: AudioNode, when: number, frequency: number, length: number, level: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(level, when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.5, length * 1.5));
  gain.connect(out);
  // A fundamental, a bright second partial and a faint inharmonic partial give the music-box shimmer.
  for (const [ratio, mix] of [[1, 1], [2, 0.35], [4.1, 0.1]] as const) {
    const oscillator = ctx.createOscillator();
    const partial = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency * ratio;
    partial.gain.value = mix;
    oscillator.connect(partial).connect(gain);
    oscillator.start(when);
    oscillator.stop(when + Math.max(0.5, length * 1.5) + 0.05);
  }
}

export interface DeckTheHalls {
  stop: () => void;
}

export function startDeckTheHalls(ctx: AudioContext): DeckTheHalls {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.6);
  const echo = ctx.createDelay(0.6);
  echo.delayTime.value = BEAT * 0.75;
  const echoGain = ctx.createGain();
  echoGain.gain.value = 0.22;
  master.connect(ctx.destination);
  master.connect(echo).connect(echoGain).connect(ctx.destination);

  const bars = 8;
  const loopLength = bars * 4 * BEAT + BEAT * 2;
  let timer = 0;
  let stopped = false;

  const schedule = (start: number) => {
    let beat = 0;
    for (const [note, beats] of MELODY) {
      bell(ctx, master, start + beat * BEAT, midi(note), beats * BEAT, 0.13);
      beat += beats;
    }
    CHORDS.forEach((chord, bar) => {
      for (let step = 0; step < 4; step++) {
        const tone = chord[[0, 2, 1, 2][step]];
        bell(ctx, master, start + (bar * 4 + step) * BEAT, midi(tone), BEAT, 0.075);
      }
    });
    timer = window.setTimeout(() => { if (!stopped) schedule(start + loopLength); }, Math.max(0, (start + loopLength - ctx.currentTime - 1) * 1000));
  };
  schedule(ctx.currentTime + 0.15);

  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      window.setTimeout(() => { try { master.disconnect(); echo.disconnect(); echoGain.disconnect(); } catch { /* already gone */ } }, 600);
    },
  };
}
