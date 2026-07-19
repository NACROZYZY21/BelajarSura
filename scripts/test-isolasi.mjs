// UJI ISOLASI MULTI-TENANT: node scripts/test-isolasi.mjs
// Membuat 2 guru dummy + siswa, membuktikan data saling tak terlihat, lalu bersih-bersih.
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

async function mkUser(email, password, meta) {
  const { rows } = await db.query(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', $3::jsonb, now(), now(), '', '', '', '', '')
     returning id`,
    [email, password, JSON.stringify(meta)]
  );
  const uid = String(rows[0].id);
  await db.query(
    `insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values (gen_random_uuid(), $1::uuid, $1::uuid,
       jsonb_build_object('sub', $1, 'email', $2::text, 'email_verified', true), 'email', now(), now(), now())`,
    [uid, email]
  );
  return uid;
}

async function login(email, password) {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return r.ok ? (await r.json()).access_token : null;
}
const rest = (token) => async (path, opts = {}) => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY, Authorization: `Bearer ${token}`,
      "Content-Type": "application/json", Prefer: "return=representation",
      ...opts.headers,
    },
  });
  const text = await r.text();
  return { status: r.status, data: text ? JSON.parse(text) : null };
};

const cek = (label, kondisi, detail = "") =>
  console.log(`${kondisi ? "✅" : "❌ GAGAL"} ${label}${detail ? " — " + detail : ""}`);

console.log("=== UJI ISOLASI MULTI-TENANT ===\n");

// 1) buat 2 guru + 1 siswa per guru
const guruA = await mkUser("guru.a@uji.belajarceria.id", "ujicoba123", { role: "guru", nama: "Guru A", avatar: "🧑‍🏫" });
const guruB = await mkUser("guru.b@uji.belajarceria.id", "ujicoba123", { role: "guru", nama: "Guru B", avatar: "👩‍🏫" });
const siswaA = await mkUser("siswa.a@uji.belajarceria.id", "ujicoba123", { role: "siswa", nama: "Siswa A", kelas: "1", guru_id: guruA });
await mkUser("siswa.b@uji.belajarceria.id", "ujicoba123", { role: "siswa", nama: "Siswa B", kelas: "1", guru_id: guruB });
console.log("Setup: Guru A, Guru B, Siswa A (milik A), Siswa B (milik B) dibuat.\n");

const tokA = await login("guru.a@uji.belajarceria.id", "ujicoba123");
const tokB = await login("guru.b@uji.belajarceria.id", "ujicoba123");
const tokSiswaA = await login("siswa.a@uji.belajarceria.id", "ujicoba123");
const tokGuruLama = await login("admin@belajarceria.id", "admin123");

// 2) tiap guru membuat mapel + modul rahasia (guru_id diisi otomatis oleh trigger)
const asA = rest(tokA), asB = rest(tokB), asSA = rest(tokSiswaA), asLama = rest(tokGuruLama);
const subA = await asA("subjects", { method: "POST", body: JSON.stringify({ nama_id: "RAHASIA-GURU-A", nama_en: "Secret A" }) });
const subB = await asB("subjects", { method: "POST", body: JSON.stringify({ nama_id: "RAHASIA-GURU-B", nama_en: "Secret B" }) });
cek("Guru A bisa membuat mapel sendiri", subA.status === 201, `status ${subA.status}`);
const modA = await asA("modules", { method: "POST", body: JSON.stringify({
  subject_id: subA.data[0].id, tingkat_kelas: 1, judul_id: "MODUL-RAHASIA-A", status: "published" }) });
cek("Guru A bisa membuat modul sendiri", modA.status === 201, `status ${modA.status}`);

// 3) ISOLASI ANTAR GURU
const listA = await asA("subjects?select=nama_id");
const listB = await asB("subjects?select=nama_id");
const namaA = listA.data.map((x) => x.nama_id);
const namaB = listB.data.map((x) => x.nama_id);
cek("Guru A HANYA melihat mapelnya sendiri", namaA.length === 1 && namaA[0] === "RAHASIA-GURU-A", JSON.stringify(namaA));
cek("Guru B TIDAK melihat mapel Guru A", !namaB.includes("RAHASIA-GURU-A"), JSON.stringify(namaB));
cek("Guru A TIDAK melihat data guru lama", !namaA.includes("Membaca & Bahasa"));

const siswaListA = await asA("profiles?role=eq.siswa&select=nama");
cek("Guru A hanya melihat siswanya sendiri", siswaListA.data.length === 1 && siswaListA.data[0].nama === "Siswa A", JSON.stringify(siswaListA.data.map((x) => x.nama)));

// akses langsung by-id lintas tenant harus kosong
const intip = await asB(`modules?id=eq.${modA.data[0].id}&select=judul_id`);
cek("Guru B intip modul A via ID → KOSONG", intip.data.length === 0);

// tulis lintas tenant harus ditolak
const nakal = await asB("subjects", { method: "POST", body: JSON.stringify({ nama_id: "SUSUPAN", nama_en: "x", guru_id: guruA }) });
cek("Guru B menyusupkan data ke tenant A → DITOLAK", nakal.status >= 400, `status ${nakal.status}`);

// 4) SISWA terikat tenant gurunya
const subSiswaA = await asSA("subjects?select=nama_id");
cek("Siswa A hanya melihat mapel Guru A", subSiswaA.data.length === 1 && subSiswaA.data[0].nama_id === "RAHASIA-GURU-A", JSON.stringify(subSiswaA.data));

// 5) GURU LAMA tetap utuh datanya
const subLama = await asLama("subjects?select=nama_id");
cek("Guru lama masih melihat seluruh datanya", subLama.data.length >= 10, `${subLama.data.length} mapel`);
cek("Guru lama TIDAK melihat mapel Guru A/B", !subLama.data.some((x) => x.nama_id.startsWith("RAHASIA")));

// 6) NONAKTIFKAN Guru A → guru & siswanya terblokir di level RLS
await db.query("update public.profiles set status_akun='nonaktif' where id=$1::uuid", [guruA]);
const listAMati = await asA("subjects?select=nama_id");
const siswaAMati = await asSA("subjects?select=nama_id");
const tulisMati = await asA("subjects", { method: "POST", body: JSON.stringify({ nama_id: "COBA-TULIS", nama_en: "x" }) });
cek("Guru A NONAKTIF: baca data → KOSONG", (listAMati.data ?? []).length === 0);
cek("Guru A NONAKTIF: tulis data → DITOLAK", tulisMati.status >= 400, `status ${tulisMati.status}`);
cek("Siswa dari guru nonaktif: baca data → KOSONG", (siswaAMati.data ?? []).length === 0);

// 7) SUPERADMIN: penjaga email — guru biasa tak bisa jadi superadmin
let guardOk = false;
try { await db.query("update public.profiles set role='superadmin' where id=$1::uuid", [guruB]); }
catch (e) { guardOk = e.message.includes("superadmin"); }
cek("Role superadmin ditolak untuk email lain (guard DB)", guardOk);

const tokSuper = await login("sultan.210403@gmail.com", "SuperCeria#2026");
cek("Superadmin bisa login", !!tokSuper);
const asSuper = rest(tokSuper);
const guruList = await asSuper("profiles?role=eq.guru&select=nama");
cek("Superadmin melihat semua guru", guruList.data.length >= 3, `${guruList.data.length} guru`);

// 8) bersih-bersih
await db.query("delete from auth.users where email like '%@uji.belajarceria.id'");
console.log("\nBersih-bersih: semua akun uji dihapus.");
await db.end();
