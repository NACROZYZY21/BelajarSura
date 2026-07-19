// SEED FASE 3: 2 guru contoh (1 aktif, 1 nonaktif) + siswa + modul + ujian UTS + hasil.
//   Prasyarat: dev server jalan (npm run dev) & migration 006-010 diterapkan.
//   node scripts/seed-fase3.mjs   (idempotent — aman diulang)
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
function cookieOf(session) {
  const raw = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const name = "sb-ermmuelgoghnklobagux-auth-token";
  const CHUNK = 3180, out = [];
  if (raw.length <= CHUNK) out.push(`${name}=${raw}`);
  else for (let i = 0; i * CHUNK < raw.length; i++) out.push(`${name}.${i}=${raw.slice(i * CHUNK, (i + 1) * CHUNK)}`);
  return out.join("; ");
}
const apiOf = (cookie) => async (path, method = "GET", body) => {
  const r = await fetch(`http://localhost:3000${path}`, {
    method, headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, json: await r.json() };
};
const restOf = (t) => async (path, opts = {}) => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=representation", ...opts.headers },
  });
  const text = await r.text();
  return { status: r.status, data: text ? JSON.parse(text) : null };
};

const superSes = await login("sultan.210403@gmail.com", "SuperCeria#2026");
if (!superSes) { console.error("❌ Superadmin gagal login — jalankan seed-superadmin dulu / cek password."); process.exit(1); }
const superApi = apiOf(cookieOf(superSes));

async function buatGuruContoh({ nama, email, password, info, sampai, siswa, moduleTitle }) {
  // idempotent: lewati bila sudah ada
  const { rows: ada } = await db.query("select id from auth.users where email=$1", [email]);
  if (ada[0]) { console.log(`= guru ${nama} sudah ada, lewati`); return null; }

  const buat = await superApi("/api/superadmin/guru", "POST", {
    nama, email, password, info_langganan: info, langganan_sampai: sampai,
  });
  if (!buat.ok) { console.log(`❌ gagal buat ${nama}: ${buat.json.error}`); return null; }
  console.log(`+ guru ${nama} (${email}) — tenant dibekali game/badge/tahun ajaran`);

  const guruSes = await login(email, password);
  const guruApi = apiOf(cookieOf(guruSes));
  const guruRest = restOf(guruSes.access_token);

  // siswa via route asli
  const mkSiswa = await guruApi("/api/admin/students", "POST", {
    students: siswa.map((s) => ({ nama: s.nama, kelas: s.kelas, password: "belajar123" })),
  });
  const akun = (mkSiswa.json.results ?? []).filter((r) => r.ok);
  console.log(`  + ${akun.length} siswa: ${akun.map((a) => a.username).join(", ")}`);

  // 1 mapel + 1 modul published + 4 soal (bobot 100)
  const { data: subs } = await guruRest("subjects", {
    method: "POST",
    body: JSON.stringify({ nama_id: "Berhitung & Matematika", nama_en: "Counting & Math", ikon: "🔢", warna: "#22c55e", urutan: 1 }),
  });
  const { data: mods } = await guruRest("modules", {
    method: "POST",
    body: JSON.stringify({
      subject_id: subs[0].id, tingkat_kelas: 1, judul_id: moduleTitle, judul_en: moduleTitle,
      materi_id: `# ${moduleTitle} ➕\n\nAyo berlatih berhitung! Perhatikan contoh:\n\n- **2 + 3 = 5**\n- **4 + 4 = 8**\n\nKerjakan pelan-pelan ya! 💪`,
      materi_en: `# ${moduleTitle}\n\nLet's practice! Examples:\n\n- **2 + 3 = 5**\n- **4 + 4 = 8**`,
      urutan: 1, status: "published",
    }),
  });
  const soal = [
    { tipe: "pg", pertanyaan_id: "2 + 3 = ...", pertanyaan_en: "2 + 3 = ...", opsi: { id: ["4", "5", "6", "7"], en: ["4", "5", "6", "7"] }, jawaban_benar: "1", poin: 25, urutan: 1 },
    { tipe: "pg", pertanyaan_id: "4 + 4 = ...", pertanyaan_en: "4 + 4 = ...", opsi: { id: ["6", "7", "8", "9"], en: ["6", "7", "8", "9"] }, jawaban_benar: "2", poin: 25, urutan: 2 },
    { tipe: "pg", pertanyaan_id: "10 - 6 = ...", pertanyaan_en: "10 - 6 = ...", opsi: { id: ["2", "3", "4", "5"], en: ["2", "3", "4", "5"] }, jawaban_benar: "2", poin: 25, urutan: 3 },
    { tipe: "esai", pertanyaan_id: "5 + 3 = ... (tulis angkanya)", pertanyaan_en: "5 + 3 = ...", opsi: null, jawaban_benar: "8", poin: 25, urutan: 4 },
  ];
  const { data: qrows } = await guruRest("questions", {
    method: "POST",
    body: JSON.stringify(soal.map((q) => ({ ...q, module_id: mods[0].id }))),
  });
  console.log(`  + mapel + modul "${moduleTitle}" (${qrows.length} soal)`);

  // 1 ujian UTS online terjadwal (buka sejak 1 jam lalu s/d 7 hari) — terbit
  const { data: exams } = await guruRest("exams", {
    method: "POST",
    body: JSON.stringify({
      nama: `UTS Matematika — ${nama}`, jenis: "UTS", subject_id: subs[0].id, tingkat_kelas: 1,
      status: "terbit", mode_online: true,
      buka: new Date(Date.now() - 3600000).toISOString(),
      tutup: new Date(Date.now() + 7 * 86400000).toISOString(),
      durasi_menit: 60, acak_soal: true, acak_opsi: false, peserta_kelas: [],
    }),
  });
  const kosong = { tipe: null, pertanyaan_id: null, pertanyaan_en: null, opsi: null, jawaban_benar: null };
  await guruRest("exam_questions", {
    method: "POST",
    body: JSON.stringify(qrows.map((q, i) => ({
      exam_id: exams[0].id, question_id: q.id, poin: q.poin, urutan: i + 1, ...kosong,
    }))),
  });
  console.log(`  + ujian "UTS Matematika" online terjadwal (terbit)`);

  // 1 siswa mengerjakan ujian via API asli → hasil terisi
  if (akun[0]) {
    const sSes = await login(`${akun[0].username}@siswa.belajarceria.id`, "belajar123");
    const sApi = apiOf(cookieOf(sSes));
    await sApi(`/api/ujian/${exams[0].id}`, "POST", { action: "mulai" });
    const get = await sApi(`/api/ujian/${exams[0].id}`);
    const jawaban = {};
    for (const q of get.json.questions ?? []) {
      // jawab: PG pilih opsi kedua-ketiga (variatif), esai diisi
      jawaban[q.id] = q.tipe === "pg" ? "2" : "delapan";
    }
    const hasil = await sApi(`/api/ujian/${exams[0].id}`, "POST", { action: "kumpul", jawaban, ragu: [] });
    console.log(`  + ${akun[0].nama} mengerjakan ujian → nilai PG ${hasil.json.nilai_pg ?? "?"}`);
  }

  return { email };
}

console.log("=== SEED FASE 3 ===\n");
await buatGuruContoh({
  nama: "Bu Sinta", email: "sinta@guru.belajarceria.id", password: "gurusinta123",
  info: "Langganan aktif — mulai Jul 2026, Rp75rb/bln",
  sampai: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
  siswa: [{ nama: "Lala", kelas: 1 }, { nama: "Momo", kelas: 1 }, { nama: "Nino", kelas: 2 }],
  moduleTitle: "Penjumlahan Dasar",
});
const rahmat = await buatGuruContoh({
  nama: "Pak Rahmat", email: "rahmat@guru.belajarceria.id", password: "gururahmat123",
  info: "MENUNGGAK — jatuh tempo lewat, tagih manual",
  sampai: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  siswa: [{ nama: "Opik", kelas: 1 }, { nama: "Putri", kelas: 2 }],
  moduleTitle: "Pengurangan Dasar",
});

// Pak Rahmat dinonaktifkan (contoh guru menunggak → blokir login)
if (rahmat) {
  await db.query(
    "update public.profiles set status_akun='nonaktif' where id=(select id from auth.users where email=$1)",
    [rahmat.email]
  );
  console.log("\n🔒 Pak Rahmat dinonaktifkan — login guru & siswanya kini terblokir.");
}

console.log("\n✅ SEED FASE 3 SELESAI!");
console.log("   Superadmin   : sultan.210403@gmail.com / SuperCeria#2026");
console.log("   Guru aktif   : sinta@guru.belajarceria.id / gurusinta123 (siswa: lala, momo, nino / belajar123)");
console.log("   Guru nonaktif: rahmat@guru.belajarceria.id / gururahmat123 (uji blokir login)");
console.log("   Guru lama    : admin@belajarceria.id / admin123");
await db.end();
