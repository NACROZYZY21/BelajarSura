"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/sfx";
import { burstConfetti } from "@/lib/confetti";
import { useI18n } from "@/lib/i18n";

interface Item {
  kalimat_id: string;
  kalimat_en: string;
  jawaban_id: string;
  jawaban_en: string;
  pilihan_id: string[];
  pilihan_en: string[];
}

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/** Game 10: Lengkapi Kalimat — pilih kata yang hilang pada kalimat rumpang. */
export function LengkapiKalimat({
  config,
  onFinish,
}: {
  config: { items?: Item[] };
  onFinish: (correct: number, total: number) => void;
}) {
  const { lang, pick } = useI18n();
  const items = config.items?.length
    ? config.items
    : [{ kalimat_id: "Aku suka ___", kalimat_en: "I like ___", jawaban_id: "belajar", jawaban_en: "learning", pilihan_id: ["belajar", "tidur"], pilihan_en: ["learning", "sleeping"] }];

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const item = items[idx];
  const jawaban = lang === "id" ? item.jawaban_id : item.jawaban_en;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pilihan = useMemo(
    () => shuffle(lang === "id" ? item.pilihan_id : item.pilihan_en),
    [idx, lang]
  );
  const kalimat = pick(item.kalimat_id, item.kalimat_en);
  const [sebelum, sesudah] = kalimat.split("___");

  const answer = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const benar = opt === jawaban;
    if (benar) {
      sfx.correct();
      burstConfetti();
      setScore((s) => s + 1);
    } else sfx.wrong();
    setTimeout(() => {
      if (idx + 1 >= items.length) onFinish(score + (benar ? 1 : 0), items.length);
      else {
        setIdx(idx + 1);
        setPicked(null);
      }
    }, 1400);
  };

  return (
    <div className="text-center">
      <p className="mb-3 font-display font-bold text-slate-500">
        {idx + 1} / {items.length}
      </p>

      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mb-6 max-w-md rounded-3xl bg-white/90 p-6 shadow-inner"
      >
        <p className="font-display text-2xl font-extrabold leading-relaxed text-slate-700">
          {sebelum}
          <span
            className={`mx-1 inline-block min-w-20 rounded-xl border-b-4 px-2 ${
              picked
                ? picked === jawaban
                  ? "animate-pop border-mint-500 bg-mint-100 text-mint-600"
                  : "animate-shake border-berry-400 bg-berry-100 text-berry-500"
                : "border-dashed border-sky-300 text-transparent"
            }`}
          >
            {picked ?? "..."}
          </span>
          {sesudah}
        </p>
      </motion.div>

      <div className="mx-auto flex max-w-md flex-wrap justify-center gap-3">
        {pilihan.map((opt) => (
          <motion.button
            key={opt}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => answer(opt)}
            disabled={!!picked}
            className={`btn-squish rounded-2xl px-5 py-3 font-display text-xl font-extrabold shadow-lg ${
              picked && opt === jawaban
                ? "bg-mint-400 text-white"
                : picked === opt
                  ? "bg-berry-400 text-white"
                  : "bg-gradient-to-br from-sky-300 to-sky-500 text-white"
            }`}
          >
            {opt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
