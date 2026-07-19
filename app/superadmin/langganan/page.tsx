"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type Guru = Profile & { langganan_sampai?: string | null };

/** Pengingat penagihan manual: guru mendekati / melewati jatuh tempo. */
export default function LanggananPage() {
  const [gurus, setGurus] = useState<Guru[]>([]);

  useEffect(() => {
    createClient()
      .from("profiles")
      .select()
      .eq("role", "guru")
      .then(({ data }) => setGurus((data as Guru[]) ?? []));
  }, []);

  const sisaHari = (g: Guru) =>
    g.langganan_sampai
      ? Math.ceil((new Date(g.langganan_sampai).getTime() - Date.now()) / 86400000)
      : null;

  const lewat = gurus.filter((g) => (sisaHari(g) ?? 999) < 0);
  const segera = gurus.filter((g) => { const s = sisaHari(g); return s !== null && s >= 0 && s <= 14; });
  const aman = gurus.filter((g) => { const s = sisaHari(g); return s === null || s > 14; });

  const Baris = ({ g }: { g: Guru }) => {
    const s = sisaHari(g);
    return (
      <li className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
        <span className={`text-2xl ${g.status_akun === "nonaktif" ? "grayscale" : ""}`}>{g.avatar}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800">
            {g.nama}
            {g.status_akun === "nonaktif" && (
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-500">nonaktif</span>
            )}
          </p>
          <p className="text-xs text-slate-400">
            {g.langganan_sampai ? `Jatuh tempo: ${g.langganan_sampai}` : "Tanpa tanggal jatuh tempo"}
            {g.info_langganan ? ` · ${g.info_langganan.slice(0, 60)}` : ""}
          </p>
        </div>
        {s !== null && (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
            s < 0 ? "bg-red-100 text-red-600" : s <= 14 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-600"
          }`}>
            {s < 0 ? `lewat ${-s} hari` : `${s} hari lagi`}
          </span>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-2xl font-extrabold text-slate-800">💳 Status Langganan</h1>
      <p className="mb-6 text-sm font-semibold text-slate-500">
        Pengingat penagihan manual — atur tanggal jatuh tempo di Manajemen Guru.
      </p>

      <section className="mb-6">
        <h2 className="mb-2 font-display text-lg font-bold text-red-600">🚨 Sudah Lewat Jatuh Tempo ({lewat.length})</h2>
        <ul className="space-y-2">
          {lewat.map((g) => <Baris key={g.id} g={g} />)}
          {lewat.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-slate-400 shadow-sm">Tidak ada. 🎉</p>}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-display text-lg font-bold text-amber-600">⏳ Jatuh Tempo ≤ 14 Hari ({segera.length})</h2>
        <ul className="space-y-2">
          {segera.map((g) => <Baris key={g.id} g={g} />)}
          {segera.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-slate-400 shadow-sm">Tidak ada.</p>}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-bold text-emerald-600">✅ Aman ({aman.length})</h2>
        <ul className="space-y-2">
          {aman.map((g) => <Baris key={g.id} g={g} />)}
        </ul>
      </section>
    </div>
  );
}
