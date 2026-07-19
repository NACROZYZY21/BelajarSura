"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { buildRecapDocx, type RecapRow } from "@/lib/export/docx-recap";
import { downloadBlob } from "@/lib/export/docx-soal";
import { getKop, warnIfNoKop } from "@/lib/kop";
import type { Module, Profile, StudentProgress, Subject, TahunAjaran } from "@/lib/types";

type SortKey = "rank" | "nama" | "kelas" | "akhir";

export default function RecapPage() {
  const { t } = useI18n();
  const [students, setStudents] = useState<Profile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [tahunId, setTahunId] = useState("");
  const [kelas, setKelas] = useState(0);
  const [mapel, setMapel] = useState("");
  const [modulId, setModulId] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "rank", asc: true });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select().eq("role", "siswa"),
      supabase.from("subjects").select().order("urutan"),
      supabase.from("modules").select().order("tingkat_kelas").order("urutan"),
      supabase.from("student_progress").select().eq("status", "selesai"),
      supabase.from("tahun_ajaran").select().order("created_at", { ascending: false }),
    ]).then(([p, s, m, sp, ta]) => {
      setStudents((p.data as Profile[]) ?? []);
      setSubjects((s.data as Subject[]) ?? []);
      setModules((m.data as Module[]) ?? []);
      setProgress((sp.data as StudentProgress[]) ?? []);
      setTahunList((ta.data as TahunAjaran[]) ?? []);
    });
  }, []);

  // progres terfilter tahun ajaran (dipakai semua perhitungan di bawah)
  const progressFiltered = useMemo(
    () => (tahunId ? progress.filter((p) => p.tahun_ajaran_id === tahunId) : progress),
    [progress, tahunId]
  );

  // modul yang tampil sebagai kolom (mengikuti filter mapel/modul)
  const shownModules = useMemo(
    () =>
      modules.filter(
        (m) =>
          (!mapel || m.subject_id === mapel) &&
          (!modulId || m.id === modulId) &&
          (!kelas || m.tingkat_kelas === kelas)
      ),
    [modules, mapel, modulId, kelas]
  );

  const rows = useMemo(() => {
    const list = students.filter(
      (s) =>
        (!kelas || s.kelas === kelas) &&
        (!q || s.nama.toLowerCase().includes(q.toLowerCase()))
    );

    const built = list.map((s) => {
      const skorOf = (mid: string) =>
        progressFiltered.find((p) => p.student_id === s.id && p.module_id === mid)?.skor ?? null;

      const perModul: Record<string, number | null> = {};
      shownModules.forEach((m) => (perModul[m.id] = skorOf(m.id)));

      const perMapel: Record<string, number | null> = {};
      subjects.forEach((sub) => {
        const scores = modules
          .filter((m) => m.subject_id === sub.id)
          .map((m) => skorOf(m.id))
          .filter((x): x is number => x != null);
        perMapel[sub.nama_id] = scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;
      });

      const all = progressFiltered.filter((p) => p.student_id === s.id);
      const nilaiAkhir = all.length
        ? Math.round(all.reduce((a, p) => a + p.skor, 0) / all.length)
        : null;

      return { siswa: s, perModul, perMapel, nilaiAkhir, modulSelesai: all.length };
    });

    // ranking berdasarkan nilai akhir (di antara siswa terfilter)
    const ranked = [...built].sort((a, b) => (b.nilaiAkhir ?? -1) - (a.nilaiAkhir ?? -1));
    const rankMap = new Map(ranked.map((r, i) => [r.siswa.id, i + 1]));
    const withRank = built.map((r) => ({ ...r, rank: rankMap.get(r.siswa.id) ?? 0 }));

    withRank.sort((a, b) => {
      const dir = sort.asc ? 1 : -1;
      if (sort.key === "nama") return a.siswa.nama.localeCompare(b.siswa.nama) * dir;
      if (sort.key === "kelas") return ((a.siswa.kelas ?? 0) - (b.siswa.kelas ?? 0)) * dir;
      if (sort.key === "akhir") return ((a.nilaiAkhir ?? -1) - (b.nilaiAkhir ?? -1)) * dir;
      return (a.rank - b.rank) * dir;
    });
    return withRank;
  }, [students, subjects, modules, shownModules, progressFiltered, kelas, q, sort]);

  const clickSort = (key: SortKey) =>
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.asc ? " ↑" : " ↓") : "");

  const exportDocx = async () => {
    setExporting(true);
    try {
      const mapelNames = subjects.map((s) => s.nama_id);
      const recapRows: RecapRow[] = [...rows]
        .sort((a, b) => a.rank - b.rank)
        .map((r) => ({
          rank: r.rank,
          nama: r.siswa.nama,
          kelas: r.siswa.kelas,
          perMapel: r.perMapel,
          nilaiAkhir: r.nilaiAkhir,
          modulSelesai: r.modulSelesai,
        }));
      const subtitle = [
        kelas ? `Kelas ${kelas}` : "Semua Kelas",
        mapel ? subjects.find((s) => s.id === mapel)?.nama_id : "Semua Mapel",
        tahunId
          ? `T.A. ${tahunList.find((x) => x.id === tahunId)?.nama ?? ""}`
          : "Semua Tahun Ajaran",
      ].join(" · ");
      const kop = await getKop();
      warnIfNoKop(kop);
      const blob = await buildRecapDocx(recapRows, mapelNames, subtitle, kop);
      downloadBlob(blob, `rekap-nilai${kelas ? `-kelas-${kelas}` : ""}.docx`);
    } finally {
      setExporting(false);
    }
  };

  const th = "px-3 py-2.5 font-semibold whitespace-nowrap cursor-pointer select-none";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-slate-800">🧮 Recap Nilai</h1>
        <button
          onClick={exportDocx}
          disabled={exporting || rows.length === 0}
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-600 disabled:opacity-50"
        >
          {exporting ? "⏳..." : "📄 Ekspor Word (.docx)"}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
        />
        <select value={kelas} onChange={(e) => setKelas(+e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none">
          <option value={0}>Semua Kelas</option>
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <option key={k} value={k}>{t("grade")} {k}</option>
          ))}
        </select>
        <select value={mapel} onChange={(e) => { setMapel(e.target.value); setModulId(""); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none">
          <option value="">Semua Mapel</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.ikon} {s.nama_id}</option>
          ))}
        </select>
        <select value={tahunId} onChange={(e) => setTahunId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none">
          <option value="">Semua Tahun Ajaran</option>
          {tahunList.map((ta) => (
            <option key={ta.id} value={ta.id}>
              {ta.status === "aktif" ? "📗" : "📦"} {ta.nama}
            </option>
          ))}
        </select>
        <select value={modulId} onChange={(e) => setModulId(e.target.value)}
          className="max-w-52 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none">
          <option value="">Semua Modul</option>
          {modules
            .filter((m) => !mapel || m.subject_id === mapel)
            .map((m) => (
              <option key={m.id} value={m.id}>{m.judul_id}</option>
            ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className={th} onClick={() => clickSort("rank")}>🏆 Rank{arrow("rank")}</th>
              <th className={th} onClick={() => clickSort("nama")}>Nama{arrow("nama")}</th>
              <th className={th} onClick={() => clickSort("kelas")}>Kelas{arrow("kelas")}</th>
              {shownModules.map((m) => (
                <th key={m.id} className="max-w-28 truncate px-3 py-2.5 font-semibold" title={m.judul_id}>
                  {m.judul_id}
                </th>
              ))}
              {subjects.map((s) => (
                <th key={s.id} className="px-3 py-2.5 font-semibold whitespace-nowrap">
                  Rata {s.ikon}
                </th>
              ))}
              <th className={th} onClick={() => clickSort("akhir")}>Nilai Akhir{arrow("akhir")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.siswa.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-3 py-2 font-bold text-slate-500">
                  {["🥇", "🥈", "🥉"][r.rank - 1] ?? r.rank}
                </td>
                <td className="px-3 py-2 font-semibold text-slate-700">
                  {r.siswa.avatar} {r.siswa.nama}
                </td>
                <td className="px-3 py-2">{r.siswa.kelas ?? "-"}</td>
                {shownModules.map((m) => {
                  const v = r.perModul[m.id];
                  return (
                    <td key={m.id} className="px-3 py-2">
                      {v != null ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          v >= 70 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                        }`}>{v}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  );
                })}
                {subjects.map((s) => (
                  <td key={s.id} className="px-3 py-2 font-semibold text-slate-600">
                    {r.perMapel[s.nama_id] ?? <span className="text-slate-300">—</span>}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 font-bold text-sky-700">
                    {r.nilaiAkhir ?? "—"}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={99} className="px-4 py-8 text-center text-slate-400">Tidak ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Nilai akhir = rata-rata semua modul selesai (mengikuti filter tahun ajaran).
      </p>
    </div>
  );
}
