"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { buildSoalDocx, downloadBlob } from "@/lib/export/docx-soal";
import type { Module, Question, Subject } from "@/lib/types";

export default function ModulesPage() {
  const { t } = useI18n();
  const [modules, setModules] = useState<Module[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterKelas, setFilterKelas] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);

  const exportSoal = async (m: Module, withKey: boolean) => {
    setExporting(m.id + (withKey ? "k" : ""));
    try {
      const { data } = await createClient()
        .from("questions")
        .select()
        .eq("module_id", m.id)
        .order("urutan");
      const subject = subjects.find((x) => x.id === m.subject_id);
      const blob = await buildSoalDocx(m, subject, (data as Question[]) ?? [], withKey);
      const slug = m.judul_id.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      downloadBlob(blob, `soal-${slug}${withKey ? "-kunci" : ""}.docx`);
    } finally {
      setExporting(null);
    }
  };

  const load = () => {
    const supabase = createClient();
    supabase
      .from("modules")
      .select()
      .order("tingkat_kelas")
      .order("urutan")
      .then(({ data }) => setModules((data as Module[]) ?? []));
    supabase
      .from("subjects")
      .select()
      .order("urutan")
      .then(({ data }) => setSubjects((data as Subject[]) ?? []));
  };

  useEffect(load, []);

  const remove = async (m: Module) => {
    if (!confirm(`Hapus modul "${m.judul_id}"?`)) return;
    await createClient().from("modules").delete().eq("id", m.id);
    load();
  };

  const togglePublish = async (m: Module) => {
    await createClient()
      .from("modules")
      .update({ status: m.status === "published" ? "draft" : "published" })
      .eq("id", m.id);
    load();
  };

  const shown = modules.filter(
    (m) =>
      (!filterSubject || m.subject_id === filterSubject) &&
      (!filterKelas || m.tingkat_kelas === filterKelas)
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-slate-800">📝 {t("modules")}</h1>
        <Link
          href="/admin/modules/new"
          className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white shadow hover:bg-sky-600"
        >
          + {t("add")}
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none"
        >
          <option value="">Semua Mapel</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ikon} {s.nama_id}
            </option>
          ))}
        </select>
        <select
          value={filterKelas}
          onChange={(e) => setFilterKelas(+e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none"
        >
          <option value={0}>Semua Kelas</option>
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <option key={k} value={k}>
              {t("grade")} {k}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="px-4 py-3 font-semibold">Judul</th>
              <th className="px-4 py-3 font-semibold">Mapel</th>
              <th className="px-4 py-3 font-semibold">Kelas</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">AI</th>
              <th className="px-4 py-3 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((m, i) => {
              const s = subjects.find((x) => x.id === m.subject_id);
              return (
                <motion.tr
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-semibold text-slate-700">{m.judul_id}</td>
                  <td className="px-4 py-3">
                    {s?.ikon} {s?.nama_id}
                  </td>
                  <td className="px-4 py-3">{m.tingkat_kelas}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublish(m)}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        m.status === "published"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {m.status === "published" ? `✅ ${t("published")}` : `📄 ${t("draft")}`}
                    </button>
                  </td>
                  <td className="px-4 py-3">{m.dibuat_oleh_ai ? "🤖" : ""}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Link
                        href={`/admin/modules/${m.id}`}
                        className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-200"
                        title={t("edit")}
                      >
                        ✏️
                      </Link>
                      <button
                        onClick={() => exportSoal(m, false)}
                        disabled={exporting !== null}
                        title="Unduh soal Word (tanpa kunci)"
                        className="rounded-lg bg-indigo-50 px-2.5 py-1.5 font-semibold text-indigo-500 hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {exporting === m.id ? "⏳" : "📄"}
                      </button>
                      <button
                        onClick={() => exportSoal(m, true)}
                        disabled={exporting !== null}
                        title="Unduh soal Word + kunci jawaban"
                        className="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {exporting === m.id + "k" ? "⏳" : "🔑"}
                      </button>
                      <Link
                        href={`/admin/modules/${m.id}/cetak`}
                        target="_blank"
                        title="Cetak / Simpan PDF (tambah ?kunci=1 untuk versi guru)"
                        className="rounded-lg bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-600 hover:bg-amber-100"
                      >
                        🖨️
                      </Link>
                      <button
                        onClick={() => remove(m)}
                        className="rounded-lg bg-red-50 px-2.5 py-1.5 font-semibold text-red-500 hover:bg-red-100"
                        title={t("delete")}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Belum ada modul.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
