"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { buildRecapDocx, type RecapRow } from "@/lib/export/docx-recap";
import { downloadBlob } from "@/lib/export/docx-soal";
import { getKop, warnIfNoKop } from "@/lib/kop";
import type { Module, Profile, StudentProgress, Subject, TahunAjaran } from "@/lib/types";

export default function ArsipPage() {
  const [tahun, setTahun] = useState<TahunAjaran[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [closing, setClosing] = useState<TahunAjaran | null>(null);
  const [closeStep, setCloseStep] = useState(1);
  const [deleting, setDeleting] = useState<TahunAjaran | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    const supabase = createClient();
    Promise.all([
      supabase.from("tahun_ajaran").select().order("created_at", { ascending: false }),
      supabase.from("profiles").select().eq("role", "siswa"),
      supabase.from("subjects").select(),
      supabase.from("modules").select(),
      supabase.from("student_progress").select().eq("status", "selesai"),
    ]).then(([ta, p, s, m, sp]) => {
      setTahun((ta.data as TahunAjaran[]) ?? []);
      setStudents((p.data as Profile[]) ?? []);
      setSubjects((s.data as Subject[]) ?? []);
      setModules((m.data as Module[]) ?? []);
      setProgress((sp.data as StudentProgress[]) ?? []);
    });
  };

  useEffect(load, []);

  const studentsOf = (taId: string) => students.filter((s) => s.tahun_ajaran_id === taId);

  const buildRows = (taId: string): RecapRow[] => {
    const list = studentsOf(taId);
    const prog = progress.filter((p) => p.tahun_ajaran_id === taId);
    const rows = list.map((s) => {
      const mine = prog.filter((p) => p.student_id === s.id);
      const perMapel: Record<string, number | null> = {};
      subjects.forEach((sub) => {
        const scores = mine
          .filter((p) => modules.find((m) => m.id === p.module_id)?.subject_id === sub.id)
          .map((p) => p.skor);
        perMapel[sub.nama_id] = scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;
      });
      const nilaiAkhir = mine.length
        ? Math.round(mine.reduce((a, p) => a + p.skor, 0) / mine.length)
        : null;
      return { nama: s.nama, kelas: s.kelas, perMapel, nilaiAkhir, modulSelesai: mine.length, rank: 0 };
    });
    rows.sort((a, b) => (b.nilaiAkhir ?? -1) - (a.nilaiAkhir ?? -1));
    rows.forEach((r, i) => (r.rank = i + 1));
    return rows;
  };

  const exportTahun = async (ta: TahunAjaran) => {
    const kop = await getKop();
    warnIfNoKop(kop);
    const blob = await buildRecapDocx(
      buildRows(ta.id),
      subjects.map((s) => s.nama_id),
      `Arsip Tahun Ajaran ${ta.nama}`,
      kop
    );
    downloadBlob(blob, `arsip-${ta.nama.replace("/", "-")}.docx`);
  };

  const tutupTahun = async () => {
    if (!closing) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/tahun-ajaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tahunId: closing.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg(
        `✅ Tahun ${closing.nama} ditutup — ${json.siswaDinonaktifkan} siswa dinonaktifkan${json.tahunBaru ? `, tahun ${json.tahunBaru} disiapkan` : ""}.`
      );
      setClosing(null);
      setCloseStep(1);
      load();
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Gagal"}`);
    } finally {
      setBusy(false);
    }
  };

  const hapusPermanen = async () => {
    if (!deleting) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/tahun-ajaran", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tahunId: deleting.id, namaKonfirmasi: confirmName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg(`✅ Tahun ${deleting.nama} dihapus permanen (${json.akunDihapus} akun).`);
      setDeleting(null);
      setConfirmName("");
      load();
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Gagal"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-2xl font-extrabold text-slate-800">
        📦 Tahun Ajaran & Arsip
      </h1>
      <p className="mb-6 text-sm font-semibold text-slate-500">
        Tutup tahun ajaran untuk mengarsipkan nilai & menonaktifkan akun siswanya.
      </p>
      {msg && (
        <p className="mb-4 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">
          {msg}
        </p>
      )}

      <div className="space-y-4">
        {tahun.map((ta) => {
          const siswa = studentsOf(ta.id);
          const aktif = ta.status === "aktif";
          return (
            <div key={ta.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl">{aktif ? "📗" : "📦"}</span>
                <div className="flex-1">
                  <p className="font-display text-lg font-bold text-slate-800">
                    {ta.nama}
                    <span
                      className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        aktif ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {aktif ? "Aktif" : `Diarsipkan ${ta.diarsipkan_pada?.slice(0, 10) ?? ""}`}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">{siswa.length} siswa</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setExpanded(expanded === ta.id ? null : ta.id)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    {expanded === ta.id ? "Tutup" : "👁️ Lihat"}
                  </button>
                  <button
                    onClick={() => exportTahun(ta)}
                    className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-100"
                  >
                    📄 Ekspor Word
                  </button>
                  {aktif ? (
                    <button
                      onClick={() => { setClosing(ta); setCloseStep(1); }}
                      className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-200"
                    >
                      🔒 Tutup Tahun Ajaran
                    </button>
                  ) : (
                    <button
                      onClick={() => { setDeleting(ta); setConfirmName(""); }}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-100"
                    >
                      🗑️ Hapus Permanen
                    </button>
                  )}
                </div>
              </div>

              {expanded === ta.id && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500">
                        <th className="px-3 py-2 font-semibold">#</th>
                        <th className="px-3 py-2 font-semibold">Nama</th>
                        <th className="px-3 py-2 font-semibold">Kelas</th>
                        <th className="px-3 py-2 font-semibold">Modul Selesai</th>
                        <th className="px-3 py-2 font-semibold">Nilai Akhir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildRows(ta.id).map((r) => (
                        <tr key={r.rank + r.nama} className="border-b border-slate-50">
                          <td className="px-3 py-1.5">{r.rank}</td>
                          <td className="px-3 py-1.5 font-semibold">{r.nama}</td>
                          <td className="px-3 py-1.5">{r.kelas ?? "-"}</td>
                          <td className="px-3 py-1.5">{r.modulSelesai}</td>
                          <td className="px-3 py-1.5 font-bold text-sky-700">{r.nilaiAkhir ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* modal tutup tahun — konfirmasi ganda */}
      <AnimatePresence>
        {closing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setClosing(null)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-2 font-display text-xl font-bold text-slate-800">
                🔒 Tutup Tahun Ajaran {closing.nama}?
              </h2>
              {closeStep === 1 ? (
                <>
                  <p className="mb-4 text-sm text-slate-600">
                    Semua akun siswa tahun ini (<b>{studentsOf(closing.id).length} siswa</b>) akan{" "}
                    <b>dinonaktifkan dan tidak bisa login lagi</b>. Nilai mereka tetap tersimpan di Arsip.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setClosing(null)}
                      className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">
                      Batal
                    </button>
                    <button onClick={() => setCloseStep(2)}
                      className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-white shadow hover:bg-amber-600">
                      Lanjut →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                    ⚠️ Konfirmasi kedua: Anda YAKIN menutup tahun ajaran {closing.nama}? Aksi ini
                    menonaktifkan semua siswanya sekaligus.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setClosing(null)}
                      className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">
                      Batal
                    </button>
                    <button onClick={tutupTahun} disabled={busy}
                      className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white shadow hover:bg-red-600 disabled:opacity-50">
                      {busy ? "⏳..." : "Ya, Tutup Sekarang"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* modal hapus permanen — ketik nama tahun */}
      <AnimatePresence>
        {deleting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setDeleting(null)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-2 font-display text-xl font-bold text-red-600">
                🗑️ Hapus Permanen {deleting.nama}
              </h2>
              <p className="mb-3 text-sm text-slate-600">
                <b>{studentsOf(deleting.id).length} akun siswa</b> beserta seluruh nilai & datanya akan
                dihapus <b>selamanya dan tidak bisa dikembalikan</b>.
              </p>
              <p className="mb-2 text-sm font-semibold text-slate-600">
                Ketik <code className="rounded bg-slate-100 px-1.5 font-bold">{deleting.nama}</code> untuk konfirmasi:
              </p>
              <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)}
                placeholder={deleting.nama}
                className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-red-400" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleting(null)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">
                  Batal
                </button>
                <button onClick={hapusPermanen} disabled={busy || confirmName.trim() !== deleting.nama}
                  className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white shadow hover:bg-red-600 disabled:opacity-40">
                  {busy ? "⏳..." : "Hapus Selamanya"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
