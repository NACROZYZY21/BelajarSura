"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { Module, Profile, StudentProgress, Subject } from "@/lib/types";

export default function ReportsPage() {
  const { t } = useI18n();
  const [students, setStudents] = useState<Profile[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [kelas, setKelas] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select().eq("role", "siswa"),
      supabase.from("modules").select(),
      supabase.from("subjects").select(),
      supabase.from("student_progress").select(),
    ]).then(([p, m, s, sp]) => {
      setStudents((p.data as Profile[]) ?? []);
      setModules((m.data as Module[]) ?? []);
      setSubjects((s.data as Subject[]) ?? []);
      setProgress((sp.data as StudentProgress[]) ?? []);
    });
  }, []);

  const rows = useMemo(() => {
    const list = kelas ? students.filter((s) => s.kelas === kelas) : students;
    const ids = new Set(list.map((s) => s.id));
    return modules
      .filter((m) => !kelas || m.tingkat_kelas === kelas)
      .map((m) => {
        const subj = subjects.find((x) => x.id === m.subject_id);
        const done = progress.filter(
          (p) => p.module_id === m.id && p.status === "selesai" && ids.has(p.student_id)
        );
        const avg = done.length
          ? Math.round(done.reduce((s, p) => s + p.skor, 0) / done.length)
          : 0;
        const pctDone = list.length ? Math.round((done.length / list.length) * 100) : 0;
        return {
          mapel: subj ? `${subj.ikon} ${subj.nama_id}` : "?",
          modul: m.judul_id,
          kelas: m.tingkat_kelas,
          selesai: done.length,
          persen: pctDone,
          rata: avg,
        };
      });
  }, [students, modules, subjects, progress, kelas]);

  const chartData = rows.map((r) => ({ name: r.modul.slice(0, 14), skor: r.rata }));

  const exportCsv = () => {
    const header = "Mapel,Modul,Kelas,Siswa Selesai,% Selesai,Rata-rata Skor";
    const lines = rows.map((r) =>
      [r.mapel.replace(/^[^ ]+ /, ""), `"${r.modul}"`, r.kelas, r.selesai, r.persen, r.rata].join(",")
    );
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-belajar-ceria${kelas ? `-kelas-${kelas}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-slate-800">📈 {t("reports")}</h1>
        <div className="flex gap-2">
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
            onClick={exportCsv}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600"
          >
            ⬇️ {t("export")}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-slate-700">
          🎯 {t("avg_score")} per {t("modules")}
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis domain={[0, 100]} fontSize={11} width={30} />
              <Tooltip />
              <Bar dataKey="skor" fill="#29b0f0" radius={[8, 8, 0, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="px-4 py-3 font-semibold">Mapel</th>
              <th className="px-4 py-3 font-semibold">Modul</th>
              <th className="px-4 py-3 font-semibold">Kelas</th>
              <th className="px-4 py-3 font-semibold">Selesai</th>
              <th className="px-4 py-3 font-semibold">% Siswa</th>
              <th className="px-4 py-3 font-semibold">Rata Skor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3">{r.mapel}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{r.modul}</td>
                <td className="px-4 py-3">{r.kelas}</td>
                <td className="px-4 py-3">{r.selesai}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-sky-400"
                        style={{ width: `${r.persen}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500">{r.persen}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      r.rata >= 70
                        ? "bg-emerald-100 text-emerald-600"
                        : r.rata > 0
                          ? "bg-amber-100 text-amber-600"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {r.rata || "-"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
