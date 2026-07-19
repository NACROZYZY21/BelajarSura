"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

/** Dashboard Superadmin: ringkasan sistem & guru terbaru. */
export default function SuperadminDashboard() {
  const [gurus, setGurus] = useState<Profile[] | null>(null);
  const [siswaCount, setSiswaCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select()
      .eq("role", "guru")
      .order("created_at", { ascending: false })
      .then(({ data }) => setGurus((data as Profile[]) ?? []));
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "siswa")
      .then(({ count }) => setSiswaCount(count ?? 0));
  }, []);

  const aktif = gurus?.filter((g) => g.status_akun === "aktif").length ?? 0;
  const nonaktif = (gurus?.length ?? 0) - aktif;
  const hampirTempo =
    gurus?.filter((g) => {
      const t = (g as Profile & { langganan_sampai?: string | null }).langganan_sampai;
      if (!t) return false;
      const sisa = (new Date(t).getTime() - Date.now()) / 86400000;
      return sisa <= 14;
    }).length ?? 0;

  const cards = [
    { label: "Guru Aktif", value: aktif, color: "text-emerald-600" },
    { label: "Guru Nonaktif", value: nonaktif, color: "text-slate-400" },
    { label: "Total Siswa Sistem", value: siswaCount, color: "text-sky-600" },
    { label: "Langganan ≤14 hari", value: hampirTempo, color: "text-amber-600" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-display text-2xl font-extrabold text-slate-800">📊 Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className={`font-display text-3xl font-extrabold ${c.color}`}>{c.value}</p>
            <p className="text-sm font-semibold text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-700">🆕 Guru Terbaru</h2>
          <Link href="/superadmin/guru"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700">
            Kelola Guru →
          </Link>
        </div>
        <ul className="space-y-2">
          {(gurus ?? []).slice(0, 6).map((g) => (
            <li key={g.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-2xl">{g.avatar}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{g.nama}</p>
                <p className="text-xs text-slate-400">
                  Bergabung {g.created_at?.slice(0, 10)}
                  {g.info_langganan ? ` · ${g.info_langganan.slice(0, 60)}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                g.status_akun === "aktif" ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
              }`}>
                {g.status_akun}
              </span>
            </li>
          ))}
          {gurus?.length === 0 && <p className="text-sm text-slate-400">Belum ada guru terdaftar.</p>}
        </ul>
      </div>
    </div>
  );
}
