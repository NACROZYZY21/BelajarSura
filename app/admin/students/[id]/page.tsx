"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { levelFromXp, levelProgress } from "@/lib/gamification";
import type { Badge, Module, Profile, Question, StudentProgress } from "@/lib/types";

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, pick } = useI18n();
  const [student, setStudent] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [ownedBadges, setOwnedBadges] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select().eq("id", id).single(),
      supabase.from("student_progress").select().eq("student_id", id).order("updated_at"),
      supabase.from("modules").select(),
      supabase.from("questions").select(),
      supabase.from("badges").select(),
      supabase.from("student_badges").select("badge_id").eq("student_id", id),
    ]).then(([p, sp, m, q, b, sb]) => {
      setStudent(p.data as Profile);
      setProgress((sp.data as StudentProgress[]) ?? []);
      setModules((m.data as Module[]) ?? []);
      setQuestions((q.data as Question[]) ?? []);
      setBadges((b.data as Badge[]) ?? []);
      setOwnedBadges(new Set((sb.data ?? []).map((x: { badge_id: string }) => x.badge_id)));
    });
  }, [id]);

  if (!student) return <p className="text-slate-400">{t("loading")}</p>;

  const done = progress.filter((p) => p.status === "selesai");
  const ongoing = progress.filter((p) => p.status === "berjalan");
  const modOf = (mid: string) => modules.find((m) => m.id === mid);
  const lp = levelProgress(student.xp);

  // topik paling sering salah: agregasi jawaban salah per modul
  const wrongByModule: Record<string, number> = {};
  progress.forEach((p) => {
    (p.jawaban ?? []).forEach((a) => {
      if (a.benar === false) {
        const q = questions.find((x) => x.id === a.question_id);
        if (q) wrongByModule[q.module_id] = (wrongByModule[q.module_id] ?? 0) + 1;
      }
    });
  });
  const wrongTop = Object.entries(wrongByModule)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const chartData = done
    .filter((p) => p.selesai_pada)
    .map((p) => ({
      tanggal: p.selesai_pada!.slice(5, 10),
      skor: p.skor,
      modul: pick(modOf(p.module_id)?.judul_id, modOf(p.module_id)?.judul_en),
    }));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/students" className="mb-4 inline-block font-semibold text-sky-600">
        ← {t("students")}
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl bg-white p-6 shadow-sm">
        <span className="text-6xl">{student.avatar}</span>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-extrabold text-slate-800">{student.nama}</h1>
          <p className="font-semibold text-slate-500">
            {t("grade")} {student.kelas ?? "-"} · Level {levelFromXp(student.xp)} · {student.xp} XP
            · 🔥 {student.streak} {t("streak_day")}
          </p>
          <p className="text-sm text-slate-400">
            Terakhir aktif: {student.last_active ?? "belum pernah"}
          </p>
          <div className="mt-2 h-2.5 max-w-xs overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
              style={{ width: `${lp.pct * 100}%` }}
            />
          </div>
        </div>
        <div className="flex gap-1 text-2xl">
          {badges
            .filter((b) => ownedBadges.has(b.id))
            .map((b) => (
              <span key={b.id} title={pick(b.nama_id, b.nama_en)}>
                {b.ikon}
              </span>
            ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-display text-lg font-bold text-slate-700">
          📈 Perkembangan Skor
        </h2>
        <div className="h-56">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tanggal" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} width={30} />
                <Tooltip
                  formatter={(v) => [`${v}`, "Skor"]}
                  labelFormatter={(_, p) => (p[0]?.payload as { modul: string })?.modul ?? ""}
                />
                <Line
                  type="monotone"
                  dataKey="skor"
                  stroke="#0f92d1"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#29b0f0" }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="pt-16 text-center text-slate-400">Belum ada modul selesai.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display text-lg font-bold text-slate-700">✅ Modul Selesai</h2>
          <ul className="space-y-2">
            {done.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-semibold text-slate-700">
                  {pick(modOf(p.module_id)?.judul_id, modOf(p.module_id)?.judul_en) || "?"}
                </span>
                <span className="text-sm">
                  {"⭐".repeat(p.bintang)}
                  <span className="ml-2 font-bold text-sky-600">{p.skor}</span>
                </span>
              </li>
            ))}
            {done.length === 0 && <p className="text-sm text-slate-400">Belum ada.</p>}
          </ul>
          {ongoing.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 font-display font-bold text-slate-600">⏳ Sedang Dikerjakan</h3>
              <ul className="space-y-1">
                {ongoing.map((p) => (
                  <li key={p.id} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                    {pick(modOf(p.module_id)?.judul_id, modOf(p.module_id)?.judul_en)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display text-lg font-bold text-slate-700">
            ❌ Topik Sering Salah
          </h2>
          <ul className="space-y-2">
            {wrongTop.map(([mid, count]) => (
              <li key={mid} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2">
                <span className="font-semibold text-slate-700">
                  {pick(modOf(mid)?.judul_id, modOf(mid)?.judul_en) || "?"}
                </span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-500">
                  {count}x salah
                </span>
              </li>
            ))}
            {wrongTop.length === 0 && (
              <p className="text-sm text-slate-400">Tidak ada kesalahan tercatat. 🎉</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
