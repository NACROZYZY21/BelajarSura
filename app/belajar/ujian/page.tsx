"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MascotLoading } from "@/components/mascot";

function sisaWaktu(target: string): string {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return d > 0 ? `${d}h ${h}j ${m}m` : `${h}j ${m}m ${s}d`;
}

/** Daftar ujian online untuk siswa (dengan hitung mundur sebelum jam buka). */
export default function UjianSiswaPage() {
  const { t, pick } = useI18n();
  const [exams, setExams] = useState<any[] | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    fetch("/api/ujian").then(async (r) => setExams((await r.json()).exams ?? []));
    const iv = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!exams) return <MascotLoading label={t("loading")} />;

  return (
    <div>
      <h1 className="mb-5 text-center font-display text-3xl font-extrabold text-slate-700">
        🎓 {pick("Ujianku", "My Exams")}
      </h1>
      <div className="space-y-4">
        {exams.map((e) => {
          const now = Date.now();
          const belumBuka = e.buka && now < new Date(e.buka).getTime();
          const tutup = e.tutup && now > new Date(e.tutup).getTime();
          const selesai = e.attempt?.status === "selesai";
          return (
            <div key={e.id} className="rounded-3xl bg-white/90 p-5 shadow-lg">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-4xl">{e.jenis === "UAS" ? "🏁" : "📘"}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-extrabold text-slate-700">{e.nama}</p>
                  <p className="text-sm font-bold text-slate-500">
                    {e.subject ? `${e.subject.ikon} ${pick(e.subject.nama_id, e.subject.nama_en)} · ` : ""}
                    ⏱️ {e.durasi_menit} {pick("menit", "minutes")}
                  </p>
                  {e.buka && (
                    <p className="text-xs font-semibold text-slate-400">
                      🕐 {new Date(e.buka).toLocaleString("id-ID")} — {e.tutup ? new Date(e.tutup).toLocaleString("id-ID") : "…"}
                    </p>
                  )}
                </div>
                {selesai ? (
                  <div className="text-center">
                    <span className="rounded-full bg-mint-100 px-4 py-2 font-display font-extrabold text-mint-600">
                      ✅ {Number(e.attempt.nilai ?? e.attempt.nilai_pg)}
                    </span>
                    <p className="mt-1 text-xs font-bold text-slate-400">{pick("Selesai", "Done")}</p>
                  </div>
                ) : tutup ? (
                  <span className="rounded-full bg-slate-200 px-4 py-2 font-display font-bold text-slate-500">
                    🔒 {pick("Ditutup", "Closed")}
                  </span>
                ) : belumBuka ? (
                  <div className="text-center">
                    <span className="rounded-full bg-sunny-100 px-4 py-2 font-display font-extrabold text-tangerine-500">
                      ⏳ {sisaWaktu(e.buka)}
                    </span>
                    <p className="mt-1 text-xs font-bold text-slate-400">{pick("menuju dibuka", "until open")}</p>
                  </div>
                ) : (
                  <Link href={`/belajar/ujian/${e.id}`}
                    className="btn-squish rounded-2xl bg-gradient-to-r from-sky-400 to-mint-400 px-5 py-3 font-display font-extrabold text-white shadow-lg">
                    {e.attempt ? pick("Lanjutkan ▶", "Continue ▶") : pick("Kerjakan!", "Start!")}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {exams.length === 0 && (
          <p className="rounded-3xl bg-white/80 p-10 text-center font-bold text-slate-500">
            🎉 {pick("Tidak ada ujian saat ini. Belajar santai dulu yuk!", "No exams right now. Enjoy learning!")}
          </p>
        )}
      </div>
    </div>
  );
}
