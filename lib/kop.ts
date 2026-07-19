"use client";

import { createClient } from "@/lib/supabase/client";

export interface KopSurat {
  guru_id: string;
  logo_url: string | null;
  nama_instansi: string;
  alamat: string;
  telepon: string;
  email: string;
  baris_tambahan: string;
}

/** Ambil kop surat milik guru yang sedang login (RLS otomatis membatasi). */
export async function getKop(): Promise<KopSurat | null> {
  const { data } = await createClient().from("kop_surat").select().maybeSingle();
  return (data as KopSurat) ?? null;
}

export function kopTerisi(kop: KopSurat | null): boolean {
  return Boolean(kop && (kop.nama_instansi.trim() || kop.logo_url));
}

/** Peringatan lembut sekali per sesi bila ekspor berjalan tanpa kop. */
export function warnIfNoKop(kop: KopSurat | null) {
  if (kopTerisi(kop)) return;
  try {
    if (sessionStorage.getItem("bc_kop_warned")) return;
    sessionStorage.setItem("bc_kop_warned", "1");
  } catch {
    // sessionStorage tak tersedia — tampilkan saja
  }
  alert("💡 Ekspor memakai kop polos. Atur kop suratmu di menu \"Kop Surat\" ya!");
}
