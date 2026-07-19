"use client";

import { motion, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { levelProgress, mascotForLevel } from "@/lib/gamification";
import { useI18n } from "@/lib/i18n";

/** Bar XP dengan animasi mengalir + angka count-up. */
export function XpBar({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const { t } = useI18n();
  const { level, current, needed, pct } = levelProgress(xp);
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = numRef.current;
    if (!node) return;
    const controls = animate(0, current, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => (node.textContent = String(Math.round(v))),
    });
    return () => controls.stop();
  }, [current]);

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "w-full"}`}>
      <span className="text-2xl" title={`${t("level")} ${level}`}>
        {mascotForLevel(level)}
      </span>
      <div className="flex-1">
        {!compact && (
          <div className="mb-0.5 flex justify-between text-xs font-extrabold text-slate-500">
            <span>
              {t("level")} {level}
            </span>
            <span>
              <span ref={numRef}>0</span>/{needed} XP
            </span>
          </div>
        )}
        <div className={`overflow-hidden rounded-full bg-slate-200 ${compact ? "h-2.5 w-24" : "h-4"}`}>
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sunny-400 via-tangerine-400 to-sunny-400 bg-[length:200%_100%]"
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%`, backgroundPositionX: ["0%", "200%"] }}
            transition={{
              width: { duration: 0.9, ease: "easeOut" },
              backgroundPositionX: { duration: 2.5, repeat: Infinity, ease: "linear" },
            }}
          />
        </div>
      </div>
      {compact && (
        <span className="font-display text-sm font-bold text-slate-600">Lv.{level}</span>
      )}
    </div>
  );
}
