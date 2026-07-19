"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImagePickButton } from "@/components/admin/image-upload";
import type { KopSurat } from "@/lib/kop";

const KOSONG: Omit<KopSurat, "guru_id"> = {
  logo_url: null,
  nama_instansi: "",
  alamat: "",
  telepon: "",
  email: "",
  baris_tambahan: "",
};

/** Pengaturan kop surat guru — dipakai otomatis di semua ekspor Word/PDF. */
export default function KopSuratPage() {
  const [kop, setKop] = useState<Omit<KopSurat, "guru_id">>(KOSONG);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    createClient()
      .from("kop_surat")
      .select()
      .maybeSingle()
      .then(({ data }) => {
        if (data) setKop(data as KopSurat);
      });
  }, []);

  const simpan = async () => {
    setBusy(true);
    setMsg("");
    const { error } = await createClient()
      .from("kop_surat")
      .upsert({ ...kop, updated_at: new Date().toISOString() });
    setMsg(error ? `❌ ${error.message}` : "✅ Kop surat tersimpan — otomatis dipakai di semua ekspor.");
    setBusy(false);
  };

  const input =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400";
  const kontak = [kop.telepon && `Telp. ${kop.telepon}`, kop.email].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-2xl font-extrabold text-slate-800">📜 Kop Surat</h1>
      <p className="mb-6 text-sm font-semibold text-slate-500">
        Kop ini otomatis muncul di semua ekspor Word & PDF milikmu (lembar soal, ujian, recap, ranking).
      </p>
      {msg && (
        <p className="mb-4 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">{msg}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* form */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display text-lg font-bold text-slate-700">Isi Kop</h2>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Logo (opsional)</p>
              {kop.logo_url ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={kop.logo_url} alt="logo" className="h-16 w-auto rounded shadow" />
                  <button
                    onClick={() => setKop({ ...kop, logo_url: null })}
                    className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100"
                  >
                    🗑️ Hapus logo
                  </button>
                </div>
              ) : (
                <ImagePickButton
                  folder="kop"
                  label="📷 Upload Logo"
                  onUploaded={(url) => setKop({ ...kop, logo_url: url })}
                />
              )}
            </div>
            <input className={input} placeholder="Nama sekolah / instansi" value={kop.nama_instansi}
              onChange={(e) => setKop({ ...kop, nama_instansi: e.target.value })} />
            <input className={input} placeholder="Alamat" value={kop.alamat}
              onChange={(e) => setKop({ ...kop, alamat: e.target.value })} />
            <div className="flex gap-2">
              <input className={input} placeholder="Telepon" value={kop.telepon}
                onChange={(e) => setKop({ ...kop, telepon: e.target.value })} />
              <input className={input} placeholder="Email" value={kop.email}
                onChange={(e) => setKop({ ...kop, email: e.target.value })} />
            </div>
            <input className={input} placeholder="Baris tambahan (mis. NPSN / motto — opsional)"
              value={kop.baris_tambahan}
              onChange={(e) => setKop({ ...kop, baris_tambahan: e.target.value })} />
            <button onClick={simpan} disabled={busy}
              className="w-full rounded-xl bg-sky-500 py-2.5 font-semibold text-white shadow hover:bg-sky-600 disabled:opacity-50">
              {busy ? "⏳..." : "💾 Simpan Kop Surat"}
            </button>
          </div>
        </section>

        {/* pratinjau langsung */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display text-lg font-bold text-slate-700">Pratinjau</h2>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-4">
              {kop.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={kop.logo_url} alt="logo" className="h-16 w-auto shrink-0" />
              )}
              <div className="flex-1 text-center">
                <p className="text-lg font-bold uppercase leading-tight text-slate-900">
                  {kop.nama_instansi || "NAMA SEKOLAH / INSTANSI"}
                </p>
                {kop.alamat && <p className="text-xs text-slate-700">{kop.alamat}</p>}
                {kontak && <p className="text-xs text-slate-700">{kontak}</p>}
                {kop.baris_tambahan && (
                  <p className="text-xs italic text-slate-500">{kop.baris_tambahan}</p>
                )}
              </div>
              {kop.logo_url && <div className="w-16 shrink-0" />}
            </div>
            <div className="mt-3 border-b-4 border-double border-slate-900" />
            <p className="mt-4 text-center text-xs text-slate-300">— isi dokumen di bawah kop —</p>
          </div>
        </section>
      </div>
    </div>
  );
}
