// Tes end-to-end ujian (Tahap 4): node scripts/test-ujian.mjs (dev server jalan)
import pg from "pg";
import { readFileSync } from "node:fs";

const envFile = readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envFile.split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

async function login(email, password) {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return r.ok ? await r.json() : null;
}
const restOf = (t) => async (path, opts = {}) => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=representation", ...opts.headers },
  });
  const text = await r.text();
  return { status: r.status, data: text ? JSON.parse(text) : null };
};
function cookieOf(session) {
  const raw = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const name = "sb-ermmuelgoghnklobagux-auth-token";
  const CHUNK = 3180, cookies = [];
  if (raw.length <= CHUNK) cookies.push(`${name}=${raw}`);
  else for (let i = 0; i * CHUNK < raw.length; i++) cookies.push(`${name}.${i}=${raw.slice(i * CHUNK, (i + 1) * CHUNK)}`);
  return cookies.join("; ");
}
const apiOf = (cookie) => async (path, method = "GET", body) => {
  const r = await fetch(`http://localhost:3000${path}`, {
    method, headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, json: await r.json() };
};
const cek = (l, k, d = "") => console.log(`${k ? "✅" : "❌ GAGAL"} ${l}${d ? " — " + d : ""}`);

console.log("=== TES UJIAN UTS/UAS (TAHAP 4) ===\n");

const guruSes = await login("admin@belajarceria.id", "admin123");
const asGuru = restOf(guruSes.access_token);

// 1) guru menyusun ujian dari bank soal + 1 soal khusus
const { data: subs } = await asGuru("subjects?nama_id=eq.Berhitung%20%26%20Matematika&select=id");
const subjectId = subs[0].id;
const { data: exams } = await asGuru("exams", { method: "POST", body: JSON.stringify({
  nama: "UTS-TES-OTOMATIS", jenis: "UTS", subject_id: subjectId, tingkat_kelas: 1,
  status: "terbit", mode_online: true,
  buka: new Date(Date.now() - 60000).toISOString(),
  tutup: new Date(Date.now() + 3600000).toISOString(),
  durasi_menit: 30, acak_soal: true, acak_opsi: true, peserta_kelas: [1],
}) });
const exam = exams[0];
cek("Guru membuat ujian online terjadwal", !!exam?.id);

// ambil soal PG kelas 1 dari mapel matematika via modul
const { data: mods } = await asGuru(`modules?subject_id=eq.${subjectId}&tingkat_kelas=eq.1&select=id`);
const modIds = (mods ?? []).map((m) => m.id).join(",");
const { data: qs } = await asGuru(`questions?module_id=in.(${modIds})&tipe=eq.pg&select=*&limit=2`);
const { data: esaiQ } = await asGuru(`questions?module_id=in.(${modIds})&tipe=eq.esai&select=*&limit=1`);
console.log(`   (debug: ${mods?.length ?? 0} modul, ${qs?.length ?? "ERR"} PG, ${esaiQ?.length ?? "ERR"} esai)`);
if (!Array.isArray(qs)) console.log("   qs error:", JSON.stringify(qs).slice(0, 150));
const kosong = { tipe: null, pertanyaan_id: null, pertanyaan_en: null, opsi: null, jawaban_benar: null };
const insEq = await asGuru("exam_questions", { method: "POST", body: JSON.stringify([
  { exam_id: exam.id, question_id: qs[0].id, poin: 30, urutan: 1, ...kosong },
  { exam_id: exam.id, question_id: qs[1].id, poin: 30, urutan: 2, ...kosong },
  { exam_id: exam.id, question_id: esaiQ[0].id, poin: 20, urutan: 3, ...kosong },
  { exam_id: exam.id, question_id: null, poin: 20, urutan: 4, tipe: "pg",
    pertanyaan_id: "SOAL KHUSUS: 2+2=?", pertanyaan_en: "CUSTOM: 2+2=?",
    opsi: { id: ["3", "4", "5", "6"], en: ["3", "4", "5", "6"] }, jawaban_benar: "1" },
]) });
if (insEq.status >= 300) console.log("   insert exam_questions ERROR:", insEq.status, JSON.stringify(insEq.data).slice(0, 200));
const { data: eqAll } = await asGuru(`exam_questions?exam_id=eq.${exam.id}&select=*`);
cek("4 soal ujian (3 bank + 1 khusus) tersimpan, total 100 poin",
  eqAll.length === 4 && eqAll.reduce((s, e) => s + e.poin, 0) === 100);

// peta teks jawaban benar per soal (untuk menjawab benar walau opsi diacak)
const kunciTeks = new Map();
for (const eq of eqAll) {
  const src = eq.question_id ? qs.concat(esaiQ).find((q) => q.id === eq.question_id) : eq;
  if ((eq.tipe ?? src.tipe) === "pg") {
    const opsi = eq.opsi ?? src.opsi;
    kunciTeks.set(eq.id, opsi.id[Number(eq.jawaban_benar ?? src.jawaban_benar)]);
  }
}

// 2) siswa budi (kelas 1) — peserta
const budiSes = await login("budi@siswa.belajarceria.id", "belajar123");
const budiApi = apiOf(cookieOf(budiSes));
const list = await budiApi("/api/ujian");
cek("Budi (kelas 1) melihat ujian di daftarnya", list.json.exams?.some((e) => e.id === exam.id));

// sari (kelas 2) — BUKAN peserta
const sariSes = await login("sari@siswa.belajarceria.id", "belajar123");
const sariList = await apiOf(cookieOf(sariSes))("/api/ujian");
cek("Sari (kelas 2) TIDAK melihat ujian", !sariList.json.exams?.some((e) => e.id === exam.id));

// 3) kunci TIDAK bocor: query langsung exam_questions sebagai siswa → kosong
const asBudi = restOf(budiSes.access_token);
const intip = await asBudi(`exam_questions?exam_id=eq.${exam.id}&select=jawaban_benar`);
cek("Siswa intip exam_questions via REST → KOSONG (kunci aman)", (intip.data ?? []).length === 0);

// 4) alur pengerjaan
let get1 = await budiApi(`/api/ujian/${exam.id}`);
cek("Sebelum mulai: soal belum diberikan", get1.json.questions === null && get1.json.window === "buka");
await budiApi(`/api/ujian/${exam.id}`, "POST", { action: "mulai" });
get1 = await budiApi(`/api/ujian/${exam.id}`);
cek("Setelah mulai: soal diterima", Array.isArray(get1.json.questions) && get1.json.questions.length === 4);
const adaKunci = JSON.stringify(get1.json.questions).includes("jawaban_benar") || JSON.stringify(get1.json.questions).includes("kunci");
cek("Payload soal siswa TANPA kunci jawaban", !adaKunci);

// jawab: semua PG benar (cari indeks teks kunci pada opsi teracak), esai diisi
const jawaban = {};
for (const q of get1.json.questions) {
  if (q.tipe === "pg") jawaban[q.id] = String(q.opsi.id.indexOf(kunciTeks.get(q.id)));
  else jawaban[q.id] = "jawaban esai budi untuk direview";
}
await budiApi(`/api/ujian/${exam.id}`, "POST", { action: "simpan", jawaban, ragu: [] });
const kumpul = await budiApi(`/api/ujian/${exam.id}`, "POST", { action: "kumpul", jawaban, ragu: [] });
cek("Kumpul: PG dinilai otomatis (harus 80/80 dari PG, opsi teracak)", kumpul.json.nilai_pg === 80, `nilai_pg=${kumpul.json.nilai_pg}`);

const ulang = await budiApi(`/api/ujian/${exam.id}`, "POST", { action: "kumpul", jawaban, ragu: [] });
cek("Kumpul dua kali → DITOLAK", !ulang.ok);

// 5) guru menilai esai → total diperbarui (simulasi aksi halaman Hasil)
const { data: atts } = await asGuru(`exam_attempts?exam_id=eq.${exam.id}&select=*`);
const att = atts[0];
const esaiEq = eqAll.find((e) => (e.tipe ?? "esai") === "esai" && e.question_id === esaiQ[0].id);
await asGuru(`exam_attempts?id=eq.${att.id}`, { method: "PATCH", body: JSON.stringify({
  poin_esai: { [esaiEq.id]: { poin: 15, komentar: "Bagus!" } },
  nilai: Number(att.nilai_pg) + 15,
}) });
const after = await budiApi(`/api/ujian/${exam.id}`);
cek("Nilai total setelah review esai = 95", Number(after.json.attempt.nilai) === 95, `nilai=${after.json.attempt.nilai}`);

// 6) ujian belum dibuka → hitung mundur & mulai ditolak
const { data: e2 } = await asGuru("exams", { method: "POST", body: JSON.stringify({
  nama: "UTS-TES-BESOK", jenis: "UTS", subject_id: subjectId, tingkat_kelas: 1,
  status: "terbit", mode_online: true,
  buka: new Date(Date.now() + 86400000).toISOString(),
  tutup: new Date(Date.now() + 90000000).toISOString(),
}) });
const belum = await budiApi(`/api/ujian/${e2[0].id}`);
const mulaiGagal = await budiApi(`/api/ujian/${e2[0].id}`, "POST", { action: "mulai" });
cek("Ujian besok: window=belum_buka & mulai DITOLAK", belum.json.window === "belum_buka" && !mulaiGagal.ok);

// bersih-bersih
await db.query("delete from public.exams where nama like 'UTS-TES-%'");
console.log("\nBersih-bersih: ujian tes dihapus.");
await db.end();
