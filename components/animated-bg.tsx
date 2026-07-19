"use client";

/** Latar hidup: awan bergerak, bintang berkelap-kelip, gelembung mengambang. */
const CLOUDS = [
  { top: "6%", dur: "55s", delay: "0s", size: "text-6xl", opacity: "opacity-80" },
  { top: "16%", dur: "75s", delay: "-20s", size: "text-4xl", opacity: "opacity-60" },
  { top: "30%", dur: "95s", delay: "-50s", size: "text-5xl", opacity: "opacity-40" },
];
const STARS = [
  { top: "8%", left: "12%", delay: "0s" },
  { top: "14%", left: "78%", delay: "0.6s" },
  { top: "26%", left: "40%", delay: "1.2s" },
  { top: "5%", left: "55%", delay: "1.8s" },
  { top: "34%", left: "90%", delay: "0.9s" },
  { top: "40%", left: "8%", delay: "1.5s" },
];
const BUBBLES = [
  { left: "8%", size: "w-6 h-6", dur: "7s", delay: "0s" },
  { left: "25%", size: "w-4 h-4", dur: "9s", delay: "1s" },
  { left: "70%", size: "w-8 h-8", dur: "8s", delay: "2s" },
  { left: "88%", size: "w-5 h-5", dur: "10s", delay: "0.5s" },
  { left: "50%", size: "w-3 h-3", dur: "11s", delay: "3s" },
];

export function AnimatedBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-sky-50 to-mint-50" />
      {CLOUDS.map((c, i) => (
        <span
          key={`c${i}`}
          className={`absolute ${c.size} ${c.opacity} animate-drift`}
          style={{ top: c.top, animationDuration: c.dur, animationDelay: c.delay }}
        >
          ☁️
        </span>
      ))}
      {STARS.map((s, i) => (
        <span
          key={`s${i}`}
          className="absolute text-xl animate-twinkle"
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        >
          ✨
        </span>
      ))}
      {BUBBLES.map((b, i) => (
        <span
          key={`b${i}`}
          className={`absolute bottom-[-3rem] rounded-full bg-sky-300/30 border border-sky-300/50 ${b.size} animate-float`}
          style={{ left: b.left, animationDuration: b.dur, animationDelay: b.delay }}
        />
      ))}
    </div>
  );
}
