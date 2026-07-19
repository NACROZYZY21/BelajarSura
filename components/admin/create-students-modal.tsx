"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface CreatedRow {
  nama: string;
  username: string;
  password: string;
  ok: boolean;
  pesan?: string;
}

const genPassword = () => {
  // mudah diketik anak: 2 suku kata + 3 angka (contoh: buka493)
  const suku = ["ba", "bi", "bu", "ka", "ki", "ku", "ma", "mi", "mu", "sa", "si", "su", "ta", "ti", "tu"];
  const p = suku[Math.floor(Math.random() * suku.length)] + suku[Math.floor(Math.random() * suku.length)];
  return p + String(Math.floor(100 + Math.random() * 900));
};

export function CreateStudentsModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tab, setTab] = useState<"tunggal" | "massal">("tunggal");
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(genPassword());
  const [massal, setMassal] = useState("");
  const [massalKelas, setMassalKelas] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<CreatedRow[] | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      let students: { nama: string; kelas: number; username?: string; password: string }[];
      if (tab === "tunggal") {
        if (!nama.trim()) throw new Error("Nama wajib diisi");
        students = [{ nama: nama.trim(), kelas, username: username.trim() || undefined, password }];
      } else {
        // format massal: satu baris per siswa — "Nama" atau "Nama,Kelas" (CSV sederhana)
        students = massal
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map((line) => {
            const [n, k] = line.split(",").map((x) => x.trim());
            return { nama: n, kelas: k ? Number(k) : massalKelas, password: genPassword() };
          });
        if (!students.length) throw new Error("Isi daftar nama dulu");
      }
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membuat akun");
      setResults(json.results);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  };

  const copyAll = () => {
    const text = (results ?? [])
      .filter((r) => r.ok)
      .map((r) => `${r.nama} — username: ${r.username} — password: ${r.password}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const input =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-display text-xl font-bold text-slate-800">
          👤 Buat Akun Siswa
        </h2>

        {results ? (
          <div>
            <div className="mb-3 space-y-1.5">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    r.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-500"
                  }`}
                >
                  {r.ok ? (
                    <>✅ {r.nama} — <b>{r.username}</b> / <b>{r.password}</b></>
                  ) : (
                    <>❌ {r.nama}: {r.pesan}</>
                  )}
                </div>
              ))}
            </div>
            <p className="mb-3 text-xs font-semibold text-amber-600">
              ⚠️ Salin sekarang — password tidak bisa dilihat lagi setelah jendela ditutup.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={copyAll}
                className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white shadow hover:bg-sky-600">
                {copied ? "✅ Tersalin!" : "📋 Salin Semua"}
              </button>
              <button onClick={onClose}
                className="rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-600">
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ["tunggal", "1 Siswa"],
                  ["massal", "Massal / CSV"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`rounded-lg py-2 text-sm font-semibold ${
                    tab === k ? "bg-white text-sky-600 shadow" : "text-slate-500"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "tunggal" ? (
              <div className="space-y-3">
                <input className={input} placeholder="Nama siswa" value={nama}
                  onChange={(e) => setNama(e.target.value)} />
                <div className="flex gap-3">
                  <select className={input} value={kelas} onChange={(e) => setKelas(+e.target.value)}>
                    {[1, 2, 3, 4, 5, 6].map((k) => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                  <input className={input} placeholder="Username (otomatis bila kosong)"
                    value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <input className={input} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Password awal" />
                  <button type="button" onClick={() => setPassword(genPassword())}
                    title="Generate password acak"
                    className="shrink-0 rounded-xl bg-violet-100 px-3 font-semibold text-violet-600 hover:bg-violet-200">
                    🎲
                  </button>
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
                    title="Salin password"
                    className="shrink-0 rounded-xl bg-sky-100 px-3 font-semibold text-sky-600 hover:bg-sky-200">
                    {copied ? "✅" : "📋"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500">
                  Satu baris per siswa: <code className="rounded bg-slate-100 px-1">Nama</code> atau{" "}
                  <code className="rounded bg-slate-100 px-1">Nama,Kelas</code>. Password dibuat otomatis.
                </p>
                <textarea className={`${input} min-h-36 font-mono text-sm`}
                  placeholder={"Andi Wijaya\nSiti Rahma,2\nDoni,1"}
                  value={massal} onChange={(e) => setMassal(e.target.value)} />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  Kelas default (bila tidak ditulis):
                  <select className="rounded-xl border border-slate-200 px-2 py-1.5"
                    value={massalKelas} onChange={(e) => setMassalKelas(+e.target.value)}>
                    {[1, 2, 3, 4, 5, 6].map((k) => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-500">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose}
                className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">
                Batal
              </button>
              <button onClick={submit} disabled={busy}
                className="rounded-xl bg-sky-500 px-5 py-2 font-semibold text-white shadow hover:bg-sky-600 disabled:opacity-50">
                {busy ? "⏳..." : "✨ Buat Akun"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
