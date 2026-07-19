"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { MascotLoading } from "@/components/mascot";
import { GAME_REGISTRY } from "@/components/games/registry";
import { sfx } from "@/lib/sfx";
import type { Game } from "@/lib/types";

export default function GameZonePage() {
  const { t } = useI18n();
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    createClient()
      .from("games")
      .select()
      .is("module_id", null)
      .then(({ data }) =>
        setGames(
          ((data as Game[]) ?? []).filter((g) => {
            const def = GAME_REGISTRY[g.tipe_game];
            // sembunyikan game yang browsernya tidak mendukung (mis. tanpa speech recognition)
            return def && (def.isSupported?.() ?? true);
          })
        )
      );
  }, []);

  if (!games) return <MascotLoading label={t("loading")} />;

  return (
    <div>
      <h1 className="mb-5 text-center font-display text-3xl font-extrabold text-grape-500">
        🎮 {t("game_zone")}
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {games.map((g, i) => {
          const meta = GAME_REGISTRY[g.tipe_game];
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: "spring", bounce: 0.4 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
              <Link
                href={`/belajar/game/${g.id}`}
                onClick={() => sfx.click()}
                className="flex items-center gap-4 rounded-3xl bg-white/90 p-5 shadow-lg"
              >
                <motion.span
                  className="text-5xl"
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                >
                  {meta.icon}
                </motion.span>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-extrabold" style={{ color: meta.color }}>
                    {t(meta.nameKey)}
                  </h2>
                  <p className="text-sm font-bold text-slate-500">{t(meta.descKey)}</p>
                </div>
                <span
                  className="rounded-full px-4 py-2 font-display font-extrabold text-white shadow"
                  style={{ background: meta.color }}
                >
                  {t("play")}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
