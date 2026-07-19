"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { levelFromXp } from "@/lib/gamification";
import type { Badge, Profile } from "@/lib/types";

interface StudentCtx {
  profile: Profile | null;
  refresh: () => Promise<void>;
  /** Tambah XP; balikannya menandakan naik level. */
  addXp: (amount: number) => Promise<{ leveledUp: boolean; newLevel: number }>;
  /** Beri badge berdasarkan kode; balikan = badge bila baru didapat. */
  awardBadge: (kode: string) => Promise<Badge | null>;
  newBadge: Badge | null;
  clearNewBadge: () => void;
}

const Ctx = createContext<StudentCtx>({
  profile: null,
  refresh: async () => {},
  addXp: async () => ({ leveledUp: false, newLevel: 1 }),
  awardBadge: async () => null,
  newBadge: null,
  clearNewBadge: () => {},
});

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select().eq("id", user.id).single();
    if (data) setProfile(data as Profile);
  }, [supabase]);

  const awardBadge = useCallback(
    async (kode: string): Promise<Badge | null> => {
      if (!profile) return null;
      const { data: badge } = await supabase.from("badges").select().eq("kode", kode).single();
      if (!badge) return null;
      const { data: owned } = await supabase
        .from("student_badges")
        .select("badge_id")
        .eq("student_id", profile.id)
        .eq("badge_id", badge.id)
        .maybeSingle();
      if (owned) return null;
      const { error } = await supabase
        .from("student_badges")
        .insert({ student_id: profile.id, badge_id: badge.id });
      if (error) return null;
      setNewBadge(badge as Badge);
      return badge as Badge;
    },
    [profile, supabase]
  );

  const addXp = useCallback(
    async (amount: number) => {
      if (!profile || amount <= 0)
        return { leveledUp: false, newLevel: levelFromXp(profile?.xp ?? 0) };
      const before = levelFromXp(profile.xp);
      const newXp = profile.xp + amount;
      const after = levelFromXp(newXp);
      await supabase.from("profiles").update({ xp: newXp }).eq("id", profile.id);
      setProfile({ ...profile, xp: newXp });
      if (after >= 5) awardBadge("level_5");
      if (after >= 10) awardBadge("level_10");
      return { leveledUp: after > before, newLevel: after };
    },
    [profile, supabase, awardBadge]
  );

  // Streak harian: dijalankan sekali saat profil termuat
  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().slice(0, 10);
    if (profile.last_active === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = profile.last_active === yesterday ? profile.streak + 1 : 1;
    supabase
      .from("profiles")
      .update({ streak: newStreak, last_active: today })
      .eq("id", profile.id)
      .then(() => {
        setProfile((p) => (p ? { ...p, streak: newStreak, last_active: today } : p));
        if (newStreak >= 3) awardBadge("streak_3");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.last_active]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Ctx.Provider
      value={{
        profile,
        refresh,
        addXp,
        awardBadge,
        newBadge,
        clearNewBadge: () => setNewBadge(null),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useStudent = () => useContext(Ctx);
