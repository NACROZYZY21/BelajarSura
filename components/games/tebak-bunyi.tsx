"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";
import { useI18n } from "@/lib/i18n";

const ROUNDS = 8;
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/** Game 11: Tebak Bunyi Huruf — dengar bunyi huruf/suku kata (TTS), pilih yang benar. */
export function TebakBunyi({
  config,
  onFinish,
}: {
  config: { items?: string[] };
  onFinish: (correct: number, total: number) => void;
}) {
  const { t, lang } = useI18n();
  const pool = config.items?.length ? config.items : ["ba", "bu", "ma", "mi", "ka", "ku"];
  const rounds = Math.min(ROUNDS, Math.max(4, pool.length));

  const [round, setRound] = useState(0);
  const [target, setTarget] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);

  const newRound = () => {
    const tgt = pool[Math.floor(Math.random() * pool.length)];
    const wrong = shuffle(pool.filter((x) => x !== tgt)).slice(0, 3);
    setTarget(tgt);
    setOptions(shuffle([tgt, ...wrong]));
    setPicked(null);
    setTimeout(() => speak(tgt, lang), 400);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(newRound, []);

  const answer = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const benar = opt === target;
    if (benar) {
      sfx.correct();
      burstConfetti();
      setCorrect((c) => c + 1);
    } else sfx.wrong();
    setTimeout(() => {
      if (round + 1 >= rounds) onFinish(correct + (benar ? 1 : 0), rounds);
      else {
        setRound(round + 1);
        newRound();
      }
    }, 1200);
  };

  return (
    <div className="text-center">
      <p className="mb-2 font-display font-bold text-slate-500">
        {round + 1} / {rounds}
      </p>
      <motion.button
        onClick={() => speak(target, lang)}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="btn-squish mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-grape-400 to-berry-400 text-6xl shadow-xl"
        aria-label={t("listen")}
      >
        📣
      </motion.button>
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        {options.map((opt) => {
          let cls = "bg-white text-slate-700";
          if (picked && opt === target) cls = "bg-mint-400 text-white animate-pop";
          else if (picked === opt) cls = "bg-berry-400 text-white animate-shake";
          return (
            <motion.button
              key={opt}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => answer(opt)}
              className={`btn-squish rounded-3xl py-5 font-display text-4xl font-extrabold lowercase shadow-lg ${cls}`}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
