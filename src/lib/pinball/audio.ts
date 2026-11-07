// Small procedural SFX engine (Web Audio API only — no external/licensed audio assets).
export type PinballSound =
  | "launch" | "bumper" | "flipper" | "target" | "rollover" | "drain"
  | "combo" | "levelUp" | "gameOver" | "highScore" | "start" | "restart" | "ready" | "impact" | "sling"
  | "missionComplete" | "jackpotLit" | "jackpotCollected" | "tiltWarning" | "tilted" | "randomEvent" | "ramp";

export class PinballAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastImpact = -Infinity;
  muted = false;

  private ensure() {
    if (this.context && this.context.state !== "closed") return this.context;
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.context.destination);
    return this.context;
  }

  resume() {
    const ctx = this.ensure();
    if (ctx?.state === "suspended") void ctx.resume().catch(() => {});
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  private tone(freq: number, duration: number, type: OscillatorType, startGain: number, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(startGain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  private sweep(from: number, to: number, duration: number, type: OscillatorType, startGain: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(startGain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  play(sound: PinballSound, intensity = 0) {
    if (this.muted) return;
    switch (sound) {
      case "start": this.sweep(220, 660, 0.3, "triangle", 0.2); break;
      case "restart": this.tone(310, 0.08, "triangle", 0.12); this.tone(220, 0.14, "triangle", 0.1, 0.07); break;
      case "ready": this.tone(660, 0.09, "sine", 0.14); this.tone(990, 0.15, "triangle", 0.1, 0.08); break;
      case "launch":
        this.sweep(190 + intensity * 90, 85, 0.095, "triangle", 0.24);
        this.tone(1280, 0.045, "square", 0.075, 0.022);
        this.tone(640, 0.07, "triangle", 0.1, 0.043);
        break;
      case "flipper": this.tone(160, 0.053, "triangle", 0.2); this.tone(920, 0.029, "square", 0.045); break;
      case "impact": {
        const now = performance.now();
        if (now - this.lastImpact < 65) break;
        this.lastImpact = now;
        this.tone(700 + Math.min(30, intensity) * 31, 0.07, "sine", Math.min(.14, .035 + intensity * .006));
        this.tone(250, 0.033, "triangle", 0.075);
        break;
      }
      case "sling": this.sweep(240, 420, 0.075, "square", 0.10); break;
      case "bumper": this.tone(700 + intensity * 40, 0.09, "triangle", 0.18); break;
      case "target": this.tone(900, 0.07, "square", 0.14); break;
      case "rollover": this.tone(500, 0.1, "sine", 0.12); break;
      case "drain": this.sweep(400, 80, 0.4, "sawtooth", 0.18); break;
      case "combo": this.tone(600 + intensity * 80, 0.12, "triangle", 0.16); break;
      case "levelUp": this.sweep(300, 900, 0.35, "triangle", 0.22); break;
      case "gameOver": this.sweep(300, 60, 0.6, "sawtooth", 0.2); break;
      case "highScore": {
        this.tone(660, 0.15, "triangle", 0.2);
        this.tone(880, 0.18, "triangle", 0.2, 0.12);
        this.tone(1100, 0.24, "triangle", 0.2, 0.24);
        break;
      }
      case "ramp": this.sweep(500, 1300, 0.22, "triangle", 0.17); break;
      case "missionComplete": {
        this.tone(520, 0.14, "square", 0.18);
        this.tone(780, 0.16, "square", 0.18, 0.1);
        this.tone(1040, 0.22, "square", 0.18, 0.2);
        break;
      }
      case "jackpotLit": this.tone(1200, 0.1, "square", 0.14); this.tone(1200, 0.1, "square", 0.14, 0.15); break;
      case "jackpotCollected": {
        this.tone(440, 0.12, "sawtooth", 0.2);
        this.tone(660, 0.14, "sawtooth", 0.2, 0.08);
        this.tone(880, 0.16, "sawtooth", 0.2, 0.16);
        this.tone(1320, 0.3, "sawtooth", 0.22, 0.24);
        break;
      }
      case "tiltWarning": this.tone(260, 0.12, "square", 0.16); break;
      case "tilted": this.sweep(320, 90, 0.5, "square", 0.22); break;
      case "randomEvent": this.sweep(200, 700, 0.25, "sine", 0.18); break;
    }
  }

  dispose() {
    void this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
  }
}
