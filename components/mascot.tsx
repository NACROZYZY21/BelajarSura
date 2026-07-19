"use client";

import { motion } from "framer-motion";

type Mood = "happy" | "cheer" | "sad" | "idle" | "run";

/** Maskot Ceri si burung hantu kecil — muncul menyemangati anak. */
export function Mascot({
  mood = "idle",
  size = "text-6xl",
  message,
}: {
  mood?: Mood;
  size?: string;
  message?: string;
}) {
  const emoji = mood === "sad" ? "🐥" : mood === "cheer" ? "🤩" : "🐥";

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`${size} select-none`}
        animate={
          mood === "cheer"
            ? { y: [0, -24, 0], rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }
            : mood === "happy"
              ? { y: [0, -10, 0] }
              : mood === "sad"
                ? { rotate: [0, -4, 4, 0] }
                : mood === "run"
                  ? { x: [-6, 6, -6] }
                  : { y: [0, -6, 0] }
        }
        transition={{
          duration: mood === "cheer" ? 0.7 : 1.6,
          repeat: mood === "idle" || mood === "run" ? Infinity : 2,
          ease: "easeInOut",
        }}
      >
        {emoji}
      </motion.div>
      {message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative max-w-60 rounded-2xl bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 shadow-lg"
        >
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
          {message}
        </motion.div>
      )}
    </div>
  );
}

/** Loading dengan maskot berlari — bukan spinner polos. */
export function MascotLoading({ label = "Memuat..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <motion.div
        className="text-6xl"
        animate={{ x: [-30, 30], scaleX: [1, 1, -1, -1, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        🐥
      </motion.div>
      <motion.p
        className="font-display text-lg font-bold text-sky-600"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        {label}
      </motion.p>
    </div>
  );
}
