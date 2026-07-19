"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { Module, Profile, StudentProgress } from "@/lib/types";

interface Stats {
  students: number;
  modules: number;
  completions: number;
  avgScore: number;
  recent: { nama: string; avatar: string; judul: string; skor: number; kapan: string }[];
  chart: { tanggal: string; selesai: number }[];
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboardOn, setLeaderboardOn] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select().eq("role", "student"),
      supabase.from("modules").select(),
      supabase.from("student_progress").select().order("updated_at", { ascending: false }),
      supabase.from("app_settings").select().eq("key", "leaderboard_aktif").maybeSingle(),
    ]).then(([p, m, sp, st]) => {
      const students = (p.data as Profile[]) ?? [];
      const modules = (m.data as Module[]) ?? [];
      const progress = (sp.data as StudentProgress[]) ?? [];
      const done = progress.filter((x) => x.status === "selesai");
      const avg = done.length
        ? Math.round(done.reduce((s, x) => s + x.skor, 0) / done.length)
        : 0;

      // grafik: modul selesai per hari (14 hari terakhir)
      const days: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        days[d] = 0;
      }
      done.forEach((x) => {
        const d = x.selesai_pada?.slice(0, 10);
        if (d && d in days) days[d]++;
      });

      setStats({
        students: students.length,
        modules: modules.length,
        completions: done.length,
        avgScore: avg,
        recent: done.slice(0, 8).map((x) => {
          const s = students.find((y) => y.id === x.student_id);
          const mod = modules.find((y) => y.id === x.module_id);
          return {
            nama: s?.nama ?? "?",
            avatar: s?.avatar ?? "🎒",
            judul: mod?.judul_id ?? "?",
            skor: x.skor,
            kapan: x.selesai_pada?.slice(0, 10) ?? "",
          };
        }),
        chart: Object.entries(days).map(([tanggal, selesai]) => ({
          tanggal: tanggal.slice(5),
          selesai,
        })),
      });
      setLeaderboardOn(st.data ? st.data.value === true || st.data.value === "true" : true);
    });
  }, []);

  const toggleLeaderboard = async () => {
    const next = !leaderboardOn;
    setLeaderboardOn(next);
    await createClient()
      .from("app_settings")
      .upsert({ key: "leaderboard_aktif", value: next });
  };

  const cards = stats
    ? [
        { icon: "🎒", label: t("total_students"), value: stats.students, color: "bg-sky-100 text-sky-600" },
        { icon: "📝", label: t("total_modules"), value: stats.modules, color: "bg-violet-100 text-violet-600" },
        { icon: "✅", label: t("completions"), value: stats.completions, color: "bg-emerald-100 text-emerald-600" },
        { icon: "🎯", label: t("avg_score"), value: stats.avgScore, color: "bg-amber-100 text-amber-600" },
      ]
    : [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-slate-800">📊 {t("dashboard")}</h1>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm">
          <span className="text-sm font-semibold text-slate-600">🏆 {t("leaderboard")}</span>
          <button
            onClick={toggleLeaderboard}
            className={`h-6 w-11 rounded-full p-0.5 transition-colors ${leaderboardOn ? "bg-emerald-400" : "bg-slate-300"}`}
            aria-pressed={leaderboardOn}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${leaderboardOn ? "translate-x-5" : ""}`}
            />
          </button>
        </label>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl ${c.color}`}>
              {c.icon}
            </span>
            <p className="mt-3 font-display text-3xl font-extrabold text-slate-800">{c.value}</p>
            <p className="text-sm font-semibold text-slate-500">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-bold text-slate-700">
            📈 {t("completions")} (14 hari)
          </h2>
          <div className="h-64">
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chart}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#29b0f0" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#29b0f0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="tanggal" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} width={30} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="selesai"
                    stroke="#0f92d1"
                    strokeWidth={2.5}
                    fill="url(#grad)"
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold text-slate-700">
            🕐 {t("recent_activity")}
          </h2>
          <ul className="space-y-3">
            {stats?.recent.map((r, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 text-sm"
              >
                <span className="text-2xl">{r.avatar}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-700">
                    {r.nama} · <span className="text-slate-500">{r.judul}</span>
                  </p>
                  <p className="text-xs text-slate-400">{r.kapan}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    r.skor >= 70 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {r.skor}
                </span>
              </motion.li>
            ))}
            {stats?.recent.length === 0 && (
              <p className="text-sm text-slate-400">Belum ada aktivitas.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
