"use client";

/** Efek suara sederhana via WebAudio — tanpa file audio, tanpa API key. */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.15) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.05);
}

export const sfx = {
  correct() {
    tone(523, 0, 0.15, "triangle");
    tone(659, 0.12, 0.15, "triangle");
    tone(784, 0.24, 0.25, "triangle");
  },
  wrong() {
    tone(220, 0, 0.2, "sawtooth", 0.08);
    tone(185, 0.15, 0.3, "sawtooth", 0.08);
  },
  click() {
    tone(880, 0, 0.06, "square", 0.05);
  },
  levelUp() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.3, "triangle"));
  },
  star() {
    tone(1047, 0, 0.12, "sine", 0.12);
    tone(1319, 0.1, 0.2, "sine", 0.12);
  },
  flip() {
    tone(440, 0, 0.08, "sine", 0.06);
  },
};
