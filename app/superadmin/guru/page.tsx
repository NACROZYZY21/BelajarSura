"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type Guru = Profile & { langganan_sampai?: string | null };
interface GuruStats { siswa: number; modul: number; soal: number; terakhirLogin: string | null; email: string | null }

const genPassword = () => {
  const kata = ["ceria", "pintar", "hebat", "juara", "bintang", "cerdas"];
  return kata[Math.floor(Math.random() * kata.length)] + Math.floor(1000 + Math.random() * 9000) + "!";
};

export default function ManajemenGuruPage() {
  const [gurus, setGurus] = useState<Guru[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"" | "aktif" | "nonaktif">("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Guru | null>(null);
  const [detail, setDetail] = useState<{ guru: Guru; stats: GuruStats | null } | null>(null);
  const [toggling, setToggling] = useState<Guru | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // form buat guru
  const [fNama, setFNama] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPwd, setFPwd] = useState(genPassword());
  const [fInfo, setFInfo] = useState("");
  const [fSampai, setFSampai] = useState("");
  const [copied, setCopied] = useState(false);

  const load = () =>
    createClient()
      .from("profiles")
      .select()
      .eq("role", "guru")
      .order("created_at", { ascending: false })
      .then(({ data }) => setGurus((data as Guru[]) ?? []));

  useEffect(() => { load(); }, []);

  const shown = gurus.filter(
    (g) =>
      (!filter || g.status_akun === filter) &&
      (!q || g.nama.toLowerCase().includes(q.toLowerCase()))
  );

  const buatGuru = async () => {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/superadmin/guru", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: fNama, email: fEmail, password: fPwd, info_langganan: fInfo, langganan_sampai: fSampai || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg(`✅ Guru "${fNama}" dibuat — login: ${fEmail} / ${fPwd} (salin sekarang!)`);
      setShowCreate(false);
      setFNama(""); setFEmail(""); setFPwd(genPassword()); setFInfo(""); setFSampai("");
      load();
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Gagal"}`);
    } finally { setBusy(false); }
  };

  const toggleStatus = async () => {
    if (!toggling) return;
    setBusy(true);
    const next = toggling.status_akun === "aktif" ? "nonaktif" : "aktif";
    const { error } = await createClient()
      .from("profiles").update({ status_akun: next }).eq("id", toggling.id);
    setMsg(error ? `❌ ${error.message}` : `✅ ${toggling.nama} kini ${next}.`);
    setToggling(null); setBusy(false); load();
  };

  const simpanEdit = async () => {
    if (!editing) return;
    setBusy(true);
    const { error } = await createClient().from("profiles").update({
      nama: editing.nama,
      info_langganan: editing.info_langganan,
      langganan_sampai: editing.langganan_sampai || null,
    }).eq("id", editing.id);
    setMsg(error ? `❌ ${error.message}` : `✅ Data ${editing.nama} disimpan.`);
    setEditing(null); setBusy(false); load();
  };

  const resetPwd = async (g: Guru) => {
    const pwd = prompt(`Password baru untuk guru ${g.nama} (min. 6 karakter):`, genPassword());
    if (!pwd) return;
    const res = await fetch("/api/superadmin/guru", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guruId: g.id, newPassword: pwd }),
    });
    const json = await res.json();
    setMsg(res.ok ? `✅ Password ${g.nama} direset ke: ${pwd} (salin sekarang!)` : `❌ ${json.error}`);
  };

  const bukaDetail = async (g: Guru) => {
    setDetail({ guru: g, stats: null });
    const res = await fetch(`/api/superadmin/guru?id=${g.id}`);
    if (res.ok) setDetail({ guru: g, stats: await res.json() });
  };

  const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-slate-800">👩‍🏫 Manajemen Guru</h1>
        <button onClick={() => setShowCreate(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-700">
          + Daftarkan Guru
        </button>
      </div>

      {msg && (
        <p className="mb-4 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">{msg}</p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama guru..."
          className="w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        {(["", "aktif", "nonaktif"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              filter === f ? "bg-indigo-600 text-white" : "bg-white text-slate-500"
            }`}>
            {f === "" ? "Semua" : f === "aktif" ? "✅ Aktif" : "🔒 Nonaktif"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map((g) => (
          <div key={g.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-3xl ${g.status_akun === "nonaktif" ? "grayscale" : ""}`}>{g.avatar}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold text-slate-800">{g.nama}</p>
                <p className="text-xs text-slate-400">
                  {g.langganan_sampai ? `Langganan s/d ${g.langganan_sampai}` : "Tanpa tanggal jatuh tempo"}
                  {g.info_langganan ? ` · ${g.info_langganan.slice(0, 50)}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                g.status_akun === "aktif" ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
              }`}>{g.status_akun}</span>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => bukaDetail(g)} title="Detail & statistik pemakaian"
                  className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">📈</button>
                <button onClick={() => setEditing({ ...g })} title="Edit data & langganan"
                  className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-sm font-semibold text-sky-600 hover:bg-sky-100">✏️</button>
                <button onClick={() => resetPwd(g)} title="Reset password guru"
                  className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-sm font-semibold text-violet-600 hover:bg-violet-100">🔑</button>
                <button onClick={() => setToggling(g)}
                  title={g.status_akun === "aktif" ? "Nonaktifkan (guru & siswanya tak bisa login)" : "Aktifkan kembali"}
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold ${
                    g.status_akun === "aktif"
                      ? "bg-red-50 text-red-500 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}>
                  {g.status_akun === "aktif" ? "🔒 Nonaktifkan" : "✅ Aktifkan"}
                </button>
              </div>
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="rounded-2xl bg-white p-8 text-center text-slate-400 shadow-sm">Tidak ada guru.</p>
        )}
      </div>

      {/* modal buat guru */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 font-display text-xl font-bold text-slate-800">+ Daftarkan Guru Baru</h2>
              <div className="space-y-3">
                <input className={input} placeholder="Nama guru" value={fNama} onChange={(e) => setFNama(e.target.value)} />
                <input className={input} placeholder="Email (untuk login)" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
                <div className="flex gap-2">
                  <input className={input} placeholder="Password awal" value={fPwd} onChange={(e) => setFPwd(e.target.value)} />
                  <button type="button" onClick={() => setFPwd(genPassword())} title="Generate acak"
                    className="shrink-0 rounded-xl bg-violet-100 px-3 font-semibold text-violet-600 hover:bg-violet-200">🎲</button>
                  <button type="button" title="Salin password"
                    onClick={() => { navigator.clipboard.writeText(fPwd); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
                    className="shrink-0 rounded-xl bg-sky-100 px-3 font-semibold text-sky-600 hover:bg-sky-200">
                    {copied ? "✅" : "📋"}
                  </button>
                </div>
                <label className="block text-xs font-semibold text-slate-500">
                  Langganan sampai:
                  <input type="date" className={`${input} mt-1`} value={fSampai} onChange={(e) => setFSampai(e.target.value)} />
                </label>
                <textarea className={`${input} min-h-20`} value={fInfo} onChange={(e) => setFInfo(e.target.value)}
                  placeholder="Info langganan (catatan bebas: tanggal mulai, nominal, keterangan...)" />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
                <button onClick={buatGuru} disabled={busy || !fNama || !fEmail || fPwd.length < 6}
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50">
                  {busy ? "⏳..." : "✨ Buat Akun Guru"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* modal edit */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 font-display text-xl font-bold text-slate-800">✏️ Edit Guru</h2>
              <div className="space-y-3">
                <input className={input} value={editing.nama}
                  onChange={(e) => setEditing({ ...editing, nama: e.target.value })} />
                <label className="block text-xs font-semibold text-slate-500">
                  Langganan sampai:
                  <input type="date" className={`${input} mt-1`} value={editing.langganan_sampai ?? ""}
                    onChange={(e) => setEditing({ ...editing, langganan_sampai: e.target.value })} />
                </label>
                <textarea className={`${input} min-h-20`} value={editing.info_langganan}
                  onChange={(e) => setEditing({ ...editing, info_langganan: e.target.value })}
                  placeholder="Info langganan" />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
                <button onClick={simpanEdit} disabled={busy}
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50">
                  💾 Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* modal konfirmasi aktif/nonaktif */}
      <AnimatePresence>
        {toggling && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setToggling(null)}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-3 font-display text-xl font-bold text-slate-800">
                {toggling.status_akun === "aktif" ? "🔒 Nonaktifkan" : "✅ Aktifkan"} {toggling.nama}?
              </h2>
              <p className="mb-4 text-sm text-slate-600">
                {toggling.status_akun === "aktif"
                  ? "Guru ini beserta SEMUA siswanya langsung tidak bisa login. Data tidak dihapus dan kembali saat diaktifkan lagi."
                  : "Guru ini beserta siswanya bisa login kembali seperti sedia kala."}
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setToggling(null)} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
                <button onClick={toggleStatus} disabled={busy}
                  className={`rounded-xl px-5 py-2 font-semibold text-white shadow disabled:opacity-50 ${
                    toggling.status_akun === "aktif" ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
                  }`}>
                  {busy ? "⏳..." : "Ya, Lanjutkan"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* modal detail statistik */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-1 font-display text-xl font-bold text-slate-800">📈 {detail.guru.nama}</h2>
              <p className="mb-4 text-xs text-slate-400">{detail.stats?.email ?? "..."}</p>
              {detail.stats ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="font-display text-2xl font-extrabold text-sky-600">{detail.stats.siswa}</p>
                    <p className="text-xs font-semibold text-slate-500">Siswa</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="font-display text-2xl font-extrabold text-violet-600">{detail.stats.modul}</p>
                    <p className="text-xs font-semibold text-slate-500">Modul</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="font-display text-2xl font-extrabold text-emerald-600">{detail.stats.soal}</p>
                    <p className="text-xs font-semibold text-slate-500">Soal</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="font-display text-sm font-extrabold text-slate-700">
                      {detail.stats.terakhirLogin ? detail.stats.terakhirLogin.slice(0, 16).replace("T", " ") : "belum pernah"}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">Terakhir login</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">Memuat statistik...</p>
              )}
              <div className="mt-5 flex justify-end">
                <button onClick={() => setDetail(null)} className="rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-600">Tutup</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
