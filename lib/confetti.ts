"use client";

import confetti from "canvas-confetti";

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function burstConfetti() {
  if (reduced()) return;
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.65 }, scalar: 1.1 });
}

export function bigCelebration() {
  if (reduced()) return;
  const end = Date.now() + 1200;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 } });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function starPop(x = 0.5, y = 0.4) {
  if (reduced()) return;
  confetti({
    particleCount: 25,
    spread: 45,
    origin: { x, y },
    shapes: ["star"],
    colors: ["#ffd447", "#ffc21f", "#fb923c"],
    scalar: 1.3,
  });
}
