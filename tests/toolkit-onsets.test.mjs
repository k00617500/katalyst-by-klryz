import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/toolkit-onsets.js", import.meta.url), "utf8");
const sampleRate = 48_000;
const blockSize = 128;

function detectOnsets(duration, waveform) {
  const hits = [];
  let Processor;
  const scope = vm.createContext({
    sampleRate,
    currentTime: 0,
    AudioWorkletProcessor: class {
      port = { postMessage: (hit) => hits.push(hit) };
    },
    registerProcessor: (_name, processor) => { Processor = processor; },
  });
  vm.runInContext(source, scope);
  const detector = new Processor();
  for (let start = 0; start < duration * sampleRate; start += blockSize) {
    scope.currentTime = start / sampleRate;
    const channel = Float32Array.from({ length: blockSize }, (_, index) => waveform((start + index) / sampleRate));
    detector.process([[channel]]);
  }
  return hits;
}

function transient(time, start, frequency, amplitude) {
  const age = time - start;
  if (age < 0 || age > 0.028) return 0;
  return amplitude * Math.sin(2 * Math.PI * frequency * age) * Math.exp(-age / 0.009);
}

for (const bpm of [90, 120, 174]) {
  test(`locks to ${bpm} BPM through subdivisions, a stray accent, and a missing beat`, () => {
    const period = 60 / bpm;
    const beatTimes = Array.from({ length: 8 }, (_, index) => 0.1 + index * period);
    const subdivisionTimes = beatTimes.flatMap((time) => [time + period / 3, time + 2 * period / 3]);
    const timestamps = beatTimes.filter((_, index) => index !== 5);
    const strayAccent = beatTimes[3] + period * 0.58;
    const hits = detectOnsets(0.1 + 8 * period, (time) => {
      const beats = timestamps.reduce((sum, start, index) => sum + transient(time, start, index % 2 ? 460 : 75, 0.65), 0);
      const subdivisions = subdivisionTimes.reduce((sum, start) => sum + transient(time, start, 4200, 0.075), 0);
      return beats + subdivisions + transient(time, strayAccent, 75, 0.48);
    });

    assert.equal(hits.length, timestamps.length, JSON.stringify(hits));
    hits.forEach(({ time }, index) => assert.ok(Math.abs(time - timestamps[index]) < 0.012, `${time} vs ${timestamps[index]}`));
  });
}

test("the detector can establish a new tempo after a break", () => {
  const timestamps = [0.1, 0.6, 1.1, 3.0, 3.37, 3.74, 4.11];
  const hits = detectOnsets(4.5, (time) => timestamps.reduce((sum, start) => sum + transient(time, start, 75, 0.6), 0));
  assert.equal(hits.length, timestamps.length);
  hits.forEach(({ time }, index) => assert.ok(Math.abs(time - timestamps[index]) < 0.012));
});

test("a strong late hit can re-anchor the beat without filling the gap", () => {
  const timestamps = [0.1, 0.6, 1.1, 1.75, 2.4, 3.05];
  const hits = detectOnsets(3.3, (time) => timestamps.reduce((sum, start) => sum + transient(time, start, 75, 0.65), 0));
  assert.equal(hits.length, timestamps.length);
  hits.forEach(({ time }, index) => assert.ok(Math.abs(time - timestamps[index]) < 0.012));
});

test("a quieter attack on the established beat still triggers a tile", () => {
  const timestamps = [0.1, 0.6, 1.1, 1.6, 2.1, 3.1];
  const hits = detectOnsets(3.3, (time) => {
    const beat = timestamps.reduce((sum, start) => {
      return sum + transient(time, start, 75, start === 1.6 ? 0.18 : 0.65);
    }, 0);
    return beat + transient(time, 2.53, 75, 0.16);
  });
  assert.equal(hits.length, timestamps.length);
  hits.forEach(({ time }, index) => assert.ok(Math.abs(time - timestamps[index]) < 0.012));
});

test("a low-level mix can establish the same beat as a loud mix", () => {
  const timestamps = [0.1, 0.56, 1.02, 1.48, 1.94, 2.4];
  const hits = detectOnsets(2.65, (time) => timestamps.reduce((sum, start, index) => {
    return sum + transient(time, start, index % 2 ? 460 : 75, 0.012);
  }, 0));
  assert.equal(hits.length, timestamps.length);
  hits.forEach(({ time }, index) => assert.ok(Math.abs(time - timestamps[index]) < 0.012));
});

test("silence and a held bass note do not produce repeating pulses", () => {
  assert.equal(detectOnsets(1, () => 0).length, 0);
  for (const frequency of [28, 55]) {
    const hits = detectOnsets(1, (time) => time < 0.1 ? 0 : 0.6 * Math.sin(2 * Math.PI * frequency * (time - 0.1)));
    assert.equal(hits.length, 1);
    assert.ok(Math.abs(hits[0].time - 0.1) < 0.012);
  }
});
