"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { levelFromXp } from "@/lib/gamification";
import { CreateStudentsModal } from "@/components/admin/create-students-modal";
import type { Profile } from "@/lib/types";

export default function StudentsPage() {
  const { t } = useI18n();
  const [students, setStudents] = useState<Profile[]>([]);
  const [q, setQ] = useState("");
  const [kelas, setKelas] = useState(0);
  const [sortXp, setSortXp] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = () =>
    createClient()
      .from("profiles")
      .select()
      .eq("role", "student")
      .then(({ data }) => setStudents((data as Profile[]) ?? []));

  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(() => {
    let list = students.filter(
      (s) =>
        (!kelas || s.kelas === kelas) &&
        (!q || s.nama.toLowerCase().includes(q.toLowerCase()))
    );
    list = [...list].sort((a, b) => (sortXp ? b.xp - a.xp : a.nama.localeCompare(b.nama)));
    return list;
  }, [students, q, kelas, sortXp]);

  const resetPassword = async (s: Profile) => {
    const pwd = prompt(`Password baru untuk ${s.nama} (min. 6 karakter):`);
    if (!pwd) return;
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: s.id, newPassword: pwd }),
    });
    const json = await res.json();
    alert(res.ok ? `✅ Password ${s.nama} berhasil direset.` : `❌ ${json.error}`);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-slate-800">
          🎒 {t("students")}
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white shadow hover:bg-sky-600"
        >
          + Buat Akun
        </button>
      </div>
      {showCreate && (
        <CreateStudentsModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
        />
        <select
          value={kelas}
          onChange={(e) => setKelas(+e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none"
        >
          <option value={0}>Semua Kelas</option>
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <option key={k} value={k}>
              {t("grade")} {k}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSortXp(!sortXp)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
        >
          {sortXp ? "↓ XP" : "A–Z"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <Link href={`/admin/students/${s.id}`} className="block">
              <div className="flex items-center gap-3">
                <span className={`text-4xl ${s.aktif === false ? "grayscale" : ""}`}>{s.avatar}</span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-slate-800">
                    {s.nama}
                    {s.aktif === false && (
                      <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-500">
                        📦 arsip
                      </span>
                    )}
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    {t("grade")} {s.kelas ?? "-"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm font-bold">
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-600">
                  Lv.{levelFromXp(s.xp)}
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-600">
                  {s.xp} XP
                </span>
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-orange-500">
                  🔥 {s.streak}
                </span>
              </div>
            </Link>
            <button
              onClick={() => resetPassword(s)}
              className="mt-3 w-full rounded-lg bg-slate-100 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200"
            >
              🔑 {t("reset_password")}
            </button>
          </motion.div>
        ))}
        {shown.length === 0 && <p className="text-slate-400">Tidak ada siswa.</p>}
      </div>
    </div>
  );
}
