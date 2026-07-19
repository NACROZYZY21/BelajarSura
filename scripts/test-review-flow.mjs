// Tes alur review esai end-to-end (RLS asli): node scripts/test-review-flow.mjs
import { readFileSync } from "node:fs";

const envFile = readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envFile.split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function login(email, password) {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const s = await r.json();
  return { token: s.access_token, id: s.user?.id };
}

function api(token) {
  return async (path, opts = {}) => {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      ...opts,
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation" + (opts.upsert ? ",resolution=merge-duplicates" : ""),
        ...opts.headers,
      },
    });
    const text = await r.text();
    return { status: r.status, data: text ? JSON.parse(text) : null };
  };
}

// ---- 1) sebagai Budi: selesaikan modul dengan esai ----
const budi = await login("budi@siswa.belajarceria.id", "belajar123");
const asBudi = api(budi.token);

const { data: mods } = await asBudi(`modules?judul_id=eq.${encodeURIComponent("Suku Kata Seru")}&select=id`);
const moduleId = mods[0].id;
const { data: qs } = await asBudi(`questions?module_id=eq.${moduleId}&tipe=eq.esai&select=id,poin`);
const q = qs[0];

const prog = await asBudi(`student_progress?on_conflict=student_id,module_id`, {
  method: "POST", upsert: true,
  body: JSON.stringify({
    student_id: budi.id, module_id: moduleId, status: "selesai",
    skor: 55, bintang: 2, poin_pg: 30,
    jawaban: [], selesai_pada: new Date().toISOString(),
  }),
});
console.log("1) Budi simpan progress (poin_pg=30, total soal modul=55):", prog.status);

const sub = await asBudi(`essay_submissions?on_conflict=student_id,question_id`, {
  method: "POST", upsert: true,
  body: JSON.stringify({
    student_id: budi.id, module_id: moduleId, question_id: q.id,
    jawaban: "bola", status_review: "menunggu_review",
    poin_diberikan: null, komentar_admin: null, direview_pada: null,
  }),
});
console.log("2) Budi kirim jawaban esai:", sub.status, "→ status_review:", sub.data?.[0]?.status_review);

// ---- 2) sebagai Admin: review & ACC ----
const admin = await login("admin@belajarceria.id", "admin123");
const asAdmin = api(admin.token);

const pending = await asAdmin(`essay_submissions?status_review=eq.menunggu_review&select=id,jawaban`);
console.log("3) Admin lihat antrian:", pending.status, "→", pending.data.length, "esai menunggu");

const subId = sub.data[0].id;
const acc = await asAdmin(`essay_submissions?id=eq.${subId}`, {
  method: "PATCH",
  body: JSON.stringify({
    status_review: "sudah_dinilai", poin_diberikan: q.poin,
    komentar_admin: "Bagus sekali! 🎉", direview_pada: new Date().toISOString(),
  }),
});
console.log("4) Admin ACC (poin penuh", q.poin, "):", acc.status);

// hitung ulang skor seperti yang dilakukan halaman admin
const { data: allQ } = await asAdmin(`questions?module_id=eq.${moduleId}&select=poin`);
const totalAll = allQ.reduce((s, x) => s + x.poin, 0);
const skorBaru = Math.min(100, Math.round(((30 + q.poin) / totalAll) * 100));
const upd = await asAdmin(`student_progress?student_id=eq.${budi.id}&module_id=eq.${moduleId}`, {
  method: "PATCH",
  body: JSON.stringify({ skor: skorBaru, bintang: skorBaru >= 90 ? 3 : skorBaru >= 70 ? 2 : 1 }),
});
console.log("5) Admin update skor siswa →", skorBaru, "/100 :", upd.status);

// ---- 3) sebagai Budi: lihat hasil review ----
const seen = await asBudi(`essay_submissions?id=eq.${subId}&select=status_review,poin_diberikan,komentar_admin`);
console.log("6) Budi lihat hasil:", JSON.stringify(seen.data[0]));
