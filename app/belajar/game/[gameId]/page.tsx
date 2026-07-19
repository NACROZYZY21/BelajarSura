"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useStudent } from "@/lib/student-context";
import { MascotLoading } from "@/components/mascot";
import { GamePlayer } from "@/components/games/game-player";
import type { Game } from "@/lib/types";

export default function PlayGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { t } = useI18n();
  const { awardBadge } = useStudent();
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    createClient()
      .from("games")
      .select()
      .eq("id", gameId)
      .single()
      .then(({ data }) => setGame(data as Game));
  }, [gameId]);

  // lacak game yang pernah dimainkan → badge "Jagoan Game"
  useEffect(() => {
    if (!game) return;
    try {
      const played = new Set<string>(JSON.parse(localStorage.getItem("bc_played") ?? "[]"));
      played.add(game.tipe_game);
      localStorage.setItem("bc_played", JSON.stringify([...played]));
      if (played.size >= 5) awardBadge("game_master");
    } catch {
      // localStorage tidak tersedia — abaikan
    }
  }, [game, awardBadge]);

  if (!game) return <MascotLoading label={t("loading")} />;

  return (
    <div>
      <Link href="/belajar/game" className="btn-squish mb-4 inline-block text-2xl" aria-label={t("back")}>
        ⬅️
      </Link>
      <GamePlayer game={game} />
    </div>
  );
}
