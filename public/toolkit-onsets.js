/* global AudioWorkletProcessor, currentTime, registerProcessor, sampleRate */

const MIN_BEAT_GAP = 0.285;
const MAX_BEAT_GAP = 1.05;
const MIN_ACCENT = 0.0006;

class ToolkitOnsets extends AudioWorkletProcessor {
  lowPass = 0;
  midPass = 0;
  peaks = [0, 0];
  accentPeak = 0;
  signalPeak = 0;
  lastBeat = -Infinity;
  previousGap = 0;
  beatPeriod = 0;
  lowCoefficient = 1 - Math.exp(-2 * Math.PI * 180 / sampleRate);
  midCoefficient = 1 - Math.exp(-2 * Math.PI * 2400 / sampleRate);

  constructor() {
    super();
    this.port.onmessage = () => {
      this.lastBeat = -Infinity;
      this.previousGap = 0;
      this.beatPeriod = 0;
      this.accentPeak = 0;
      this.signalPeak = 0;
      this.peaks.fill(0);
      this.lowPass = 0;
      this.midPass = 0;
    };
  }

  confirmBeat(time, accent, threshold) {
    const gap = time - this.lastBeat;
    if (gap < MIN_BEAT_GAP) return false;

    if (this.beatPeriod && gap <= 2.5 * this.beatPeriod) {
      // Check phase only when there's an actual hit. A missing hit never creates a pulse.
      const beats = Math.round(gap / this.beatPeriod);
      const phaseError = Math.abs(gap - beats * this.beatPeriod);
      const tolerance = Math.min(0.09, this.beatPeriod * 0.17);
      if (beats > 0 && phaseError <= tolerance) {
        // Recover a quieter hit close to the established beat without admitting weaker off-beat sounds.
        const requiredAccent = phaseError <= Math.min(0.055, this.beatPeriod * 0.10)
          ? Math.max(MIN_ACCENT, threshold * 0.55)
          : threshold;
        if (accent < requiredAccent) return false;
        this.beatPeriod += (gap / beats - this.beatPeriod) * 0.22;
      } else {
        // A strong new hit can re-anchor a stale phase while keeping the established tempo.
        if (gap <= this.beatPeriod + tolerance || accent < threshold) return false;
      }
    } else {
      if (accent < threshold) return false;
      // Two similar gaps establish the tempo. A longer break lets the next section establish its own.
      this.beatPeriod = 0;
      const recentGap = gap <= MAX_BEAT_GAP ? gap : 0;
      if (recentGap && this.previousGap && Math.abs(recentGap - this.previousGap) < recentGap * 0.15) {
        this.beatPeriod = (recentGap + this.previousGap) / 2;
      }
      this.previousGap = recentGap;
    }

    this.lastBeat = time;
    return true;
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels.length) return true;

    let bass = 0;
    let body = 0;
    const samples = channels[0].length;
    for (let i = 0; i < samples; i++) {
      // Use the louder channel so a transient panned to either side still registers.
      const left = channels[0][i];
      const right = channels[1]?.[i] ?? left;
      const sample = Math.abs(left) >= Math.abs(right) ? left : right;
      this.lowPass += (sample - this.lowPass) * this.lowCoefficient;
      this.midPass += (sample - this.midPass) * this.midCoefficient;
      bass += this.lowPass ** 2;
      body += (this.midPass - this.lowPass) ** 2;
    }

    // Use low and midrange attacks for the main pulse. Treble details often sit between beats.
    const levels = [bass, body];
    const seconds = samples / sampleRate;
    const peakDecay = Math.exp(-seconds / 0.06);
    const referenceDecay = Math.exp(-seconds / 1.2);
    this.signalPeak *= referenceDecay;
    let strongestAccent = 0;
    for (let band = 0; band < levels.length; band++) {
      const level = Math.sqrt(levels[band] / samples);
      this.signalPeak = Math.max(this.signalPeak, level);
      // The peak envelope bridges individual waveform cycles, including sustained bass.
      const peak = this.peaks[band] * peakDecay;
      this.peaks[band] = Math.max(level, peak);
      const weight = band === 0 ? 1 : 0.55;
      const accent = (level - peak * 1.5) * weight;
      strongestAccent = Math.max(strongestAccent, accent);
    }

    this.accentPeak *= referenceDecay;
    // Match the current recording's level instead of imposing the same loudness on every track.
    const accentThreshold = Math.max(MIN_ACCENT, this.signalPeak * 0.025, this.accentPeak * 0.44);
    this.accentPeak = Math.max(this.accentPeak, strongestAccent);
    if (strongestAccent >= MIN_ACCENT && this.confirmBeat(currentTime, strongestAccent, accentThreshold)) {
      this.port.postMessage({ time: currentTime });
    }
    return true;
  }
}

registerProcessor("toolkit-onsets", ToolkitOnsets);
