"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GAME_REGISTRY } from "./registry";
import { Mascot } from "@/components/mascot";
import { useStudent } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { bigCelebration } from "@/lib/confetti";
import { sfx } from "@/lib/sfx";
import type { Game } from "@/lib/types";

/** Pembungkus semua game (via registry): judul, papan skor akhir, hadiah XP. */
export function GamePlayer({ game, onDone }: { game: Game; onDone?: () => void }) {
  const { t } = useI18n();
  const { addXp } = useStudent();
  const [done, setDone] = useState<{ correct: number; total: number; xp: number } | null>(null);
  const meta = GAME_REGISTRY[game.tipe_game];
  if (!meta) return null;
  const GameComponent = meta.Component;

  const finish = async (correct: number, total: number) => {
    const xp = correct * 3;
    setDone({ correct, total, xp });
    bigCelebration();
    sfx.levelUp();
    if (xp > 0) await addXp(xp);
  };

  const props = { config: game.config as never, onFinish: finish };

  return (
    <div className="rounded-3xl bg-white/80 p-5 shadow-lg">
      <h2
        className="mb-4 text-center font-display text-2xl font-extrabold"
        style={{ color: meta.color }}
      >
        {meta.icon} {t(meta.nameKey)}
      </h2>

      {done ? (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="py-6 text-center"
        >
          <Mascot mood="cheer" size="text-7xl" message={t("well_done")} />
          <p className="mt-4 font-display text-2xl font-extrabold text-slate-700">
            {done.correct} / {done.total} ✅
          </p>
          <p className="mt-1 inline-block rounded-full bg-sunny-100 px-4 py-1.5 font-display text-lg font-extrabold text-tangerine-500">
            +{done.xp} XP ✨
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="btn-squish rounded-2xl bg-sky-100 px-5 py-3 font-display font-extrabold text-sky-600"
            >
              🔁 {t("play_again")}
            </button>
            {onDone && (
              <button
                onClick={onDone}
                className="btn-squish rounded-2xl bg-gradient-to-r from-mint-400 to-sky-400 px-5 py-3 font-display font-extrabold text-white shadow"
              >
                {t("next")} →
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <GameComponent {...props} />
      )}
    </div>
  );
}
