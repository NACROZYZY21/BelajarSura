"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useStudent } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { MascotLoading } from "@/components/mascot";
import { XpBar } from "@/components/xp-bar";
import { AVATARS, levelFromXp } from "@/lib/gamification";
import { sfx } from "@/lib/sfx";
import type { Badge } from "@/lib/types";

interface LeaderRow {
  nama: string;
  avatar: string;
  xp: number;
  streak: number;
}

/** Pengaturan sederhana ramah anak: ganti kata sandi sendiri. */
function GantiPassword() {
  const [open, setOpen] = useState(false);
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulang, setUlang] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setMsg(null);
    if (baru.length < 6) return setMsg({ ok: false, text: "Kata sandi baru minimal 6 huruf ya! ✏️" });
    if (baru !== ulang) return setMsg({ ok: false, text: "Ulangi kata sandinya belum sama nih! 🙈" });
    setBusy(true);
    try {
      const res = await fetch("/api/student/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: lama, newPassword: baru }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg({ ok: true, text: "Hore! Kata sandimu berhasil diganti! 🎉" });
      setLama(""); setBaru(""); setUlang("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Ups, coba lagi ya!" });
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-2xl border-2 border-sky-100 bg-sky-50/50 px-4 py-3 font-bold outline-none focus:border-sky-400";

  return (
    <section className="rounded-3xl bg-white/90 p-5 shadow-lg">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between font-display text-lg font-extrabold text-slate-700"
      >
        <span>🔑 Ganti Kata Sandi</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <input type="password" className={input} placeholder="Kata sandi lama"
            value={lama} onChange={(e) => setLama(e.target.value)} />
          <input type="password" className={input} placeholder="Kata sandi baru (min. 6 huruf)"
            value={baru} onChange={(e) => setBaru(e.target.value)} />
          <input type="password" className={input} placeholder="Ulangi kata sandi baru"
            value={ulang} onChange={(e) => setUlang(e.target.value)} />
          {msg && (
            <p className={`rounded-2xl px-4 py-2 text-center font-bold ${
              msg.ok ? "bg-mint-100 text-mint-600" : "bg-berry-100 text-berry-500"
            }`}>
              {msg.text}
            </p>
          )}
          <button
            onClick={submit}
            disabled={busy || !lama || !baru || !ulang}
            className="btn-squish w-full rounded-2xl bg-gradient-to-r from-sky-400 to-mint-400 py-3 font-display text-lg font-extrabold text-white shadow-lg disabled:opacity-50"
          >
            {busy ? "⏳..." : "✨ Simpan Kata Sandi Baru"}
          </button>
        </div>
      )}
    </section>
  );
}

export default function ProfilePage() {
  const { profile, refresh } = useStudent();
  const { t, pick } = useI18n();
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("badges").select().order("xp_syarat"),
      supabase.from("student_badges").select("badge_id").eq("student_id", profile.id),
      supabase.rpc("get_leaderboard", { p_kelas: profile.kelas ?? 1 }),
    ]).then(([b, sb, lb]) => {
      setBadges((b.data as Badge[]) ?? []);
      setOwned(new Set((sb.data ?? []).map((x: { badge_id: string }) => x.badge_id)));
      setLeaders((lb.data as LeaderRow[]) ?? []);
    });
  }, [profile]);

  if (!profile || !badges) return <MascotLoading label={t("loading")} />;

  const level = levelFromXp(profile.xp);
  // avatar terbuka bertahap: 2 avatar per level
  const unlockedCount = Math.min(AVATARS.length, 2 + level);

  const changeAvatar = async (a: string) => {
    sfx.click();
    await createClient().from("profiles").update({ avatar: a }).eq("id", profile.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* kartu profil */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-white/90 p-6 text-center shadow-lg"
      >
        <motion.span
          className="inline-block text-7xl"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {profile.avatar}
        </motion.span>
        <h1 className="font-display text-2xl font-extrabold text-slate-700">{profile.nama}</h1>
        <p className="mb-4 font-bold text-slate-500">
          {t("grade")} {profile.kelas} · 🔥 {profile.streak} {t("streak_day")}
        </p>
        <XpBar xp={profile.xp} />
      </motion.section>

      {/* pilih avatar */}
      <section className="rounded-3xl bg-white/90 p-5 shadow-lg">
        <h2 className="mb-3 font-display text-lg font-extrabold text-slate-700">🎭 Avatar</h2>
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map((a, i) => {
            const unlocked = i < unlockedCount;
            return (
              <motion.button
                key={a}
                whileHover={unlocked ? { scale: 1.15 } : {}}
                whileTap={unlocked ? { scale: 0.85 } : {}}
                onClick={() => unlocked && changeAvatar(a)}
                disabled={!unlocked}
                title={unlocked ? "" : `${t("locked")} — ${t("level")} ${i - 1}`}
                className={`rounded-2xl p-2 text-3xl ${
                  profile.avatar === a
                    ? "bg-sunny-100 ring-4 ring-sunny-400"
                    : unlocked
                      ? "bg-sky-50"
                      : "opacity-30 grayscale"
                }`}
              >
                {unlocked ? a : "🔒"}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* koleksi badge */}
      <section className="rounded-3xl bg-white/90 p-5 shadow-lg">
        <h2 className="mb-3 font-display text-lg font-extrabold text-slate-700">
          🏅 {t("badges")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {badges.map((b, i) => {
            const has = owned.has(b.id);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                title={pick(b.deskripsi_id, b.deskripsi_en)}
                className={`rounded-2xl p-3 text-center ${
                  has ? "bg-gradient-to-br from-sunny-100 to-tangerine-100" : "bg-slate-100 opacity-50"
                }`}
              >
                <span className={`text-3xl ${has ? "" : "grayscale"}`}>{b.ikon}</span>
                <p className="mt-1 font-display text-xs font-bold text-slate-600">
                  {pick(b.nama_id, b.nama_en)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ganti kata sandi — nama TIDAK bisa diubah siswa (hanya admin) */}
      <GantiPassword />

      {/* papan juara */}
      {leaders.length > 0 && (
        <section className="rounded-3xl bg-white/90 p-5 shadow-lg">
          <h2 className="mb-3 font-display text-lg font-extrabold text-slate-700">
            🏆 {t("leaderboard")} — {t("grade")} {profile.kelas}
          </h2>
          <ol className="space-y-2">
            {leaders.map((l, i) => (
              <motion.li
                key={l.nama + i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${
                  l.nama === profile.nama ? "bg-sunny-100 ring-2 ring-sunny-400" : "bg-sky-50"
                }`}
              >
                <span className="font-display text-lg font-extrabold text-slate-400">
                  {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`}
                </span>
                <span className="text-2xl">{l.avatar}</span>
                <span className="flex-1 font-display font-bold text-slate-700">{l.nama}</span>
                <span className="font-display font-extrabold text-sky-600">{l.xp} XP</span>
              </motion.li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
