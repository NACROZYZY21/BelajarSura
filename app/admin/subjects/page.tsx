"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { Subject } from "@/lib/types";

const EMPTY = {
  nama_id: "",
  nama_en: "",
  ikon: "📚",
  warna: "#29b0f0",
  urutan: 0,
  aktif: true,
};

export default function SubjectsPage() {
  const { t } = useI18n();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editing, setEditing] = useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    createClient()
      .from("subjects")
      .select()
      .order("urutan")
      .then(({ data }) => setSubjects((data as Subject[]) ?? []));

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing || !editing.nama_id.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { id, ...payload } = editing;
    if (id) await supabase.from("subjects").update(payload).eq("id", id);
    else await supabase.from("subjects").insert(payload);
    setSaving(false);
    setEditing(null);
    load();
  };

  const remove = async (s: Subject) => {
    if (!confirm(`Hapus mapel "${s.nama_id}" beserta semua modulnya?`)) return;
    await createClient().from("subjects").delete().eq("id", s.id);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-slate-800">📚 {t("subjects")}</h1>
        <button
          onClick={() => setEditing({ ...EMPTY, urutan: subjects.length + 1 })}
          className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white shadow hover:bg-sky-600"
        >
          + {t("add")}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl bg-white p-5 shadow-sm"
            style={{ borderTop: `4px solid ${s.warna}` }}
          >
            <div className="flex items-start justify-between">
              <span className="text-4xl">{s.ikon}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  s.aktif ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                {s.aktif ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <h2 className="mt-2 font-display text-lg font-bold text-slate-800">{s.nama_id}</h2>
            <p className="text-sm text-slate-500">{s.nama_en}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditing({ ...s })}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                ✏️ {t("edit")}
              </button>
              <button
                onClick={() => remove(s)}
                className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-100"
              >
                🗑️ {t("delete")}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 font-display text-xl font-bold text-slate-800">
                {editing.id ? `✏️ ${t("edit")}` : `+ ${t("add")}`} {t("subjects")}
              </h2>
              <div className="space-y-3">
                <input
                  value={editing.nama_id}
                  onChange={(e) => setEditing({ ...editing, nama_id: e.target.value })}
                  placeholder="Nama (Indonesia)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400"
                />
                <input
                  value={editing.nama_en}
                  onChange={(e) => setEditing({ ...editing, nama_en: e.target.value })}
                  placeholder="Name (English)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400"
                />
                <div className="flex gap-3">
                  <input
                    value={editing.ikon}
                    onChange={(e) => setEditing({ ...editing, ikon: e.target.value })}
                    placeholder="Ikon (emoji)"
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xl outline-none focus:border-sky-400"
                  />
                  <input
                    type="color"
                    value={editing.warna}
                    onChange={(e) => setEditing({ ...editing, warna: e.target.value })}
                    className="h-11 w-16 cursor-pointer rounded-xl border border-slate-200"
                    title="Warna"
                  />
                  <input
                    type="number"
                    value={editing.urutan}
                    onChange={(e) => setEditing({ ...editing, urutan: +e.target.value })}
                    className="w-20 rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400"
                    title="Urutan"
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={editing.aktif}
                      onChange={(e) => setEditing({ ...editing, aktif: e.target.checked })}
                    />
                    Aktif
                  </label>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-sky-500 px-5 py-2 font-semibold text-white shadow hover:bg-sky-600 disabled:opacity-50"
                >
                  {saving ? "..." : t("save")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
