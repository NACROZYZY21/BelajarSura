// Tes end-to-end Tahap 6: node scripts/test-tahap6.mjs (dev server harus jalan)
import { readFileSync } from "node:fs";
import pg from "pg";

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
  return r.ok ? await r.json() : null;
}

function cookieOf(session) {
  const raw = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const name = "sb-ermmuelgoghnklobagux-auth-token";
  const CHUNK = 3180;
  const cookies = [];
  if (raw.length <= CHUNK) cookies.push(`${name}=${raw}`);
  else for (let i = 0; i * CHUNK < raw.length; i++)
    cookies.push(`${name}.${i}=${raw.slice(i * CHUNK, (i + 1) * CHUNK)}`);
  return cookies.join("; ");
}

const adminSession = await login("admin@belajarceria.id", "admin123");
const adminCookie = cookieOf(adminSession);

// 1) admin buat akun siswa uji
const create = await fetch("http://localhost:3000/api/admin/students", {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: adminCookie },
  body: JSON.stringify({ students: [{ nama: "Tes Uji Coba", kelas: 3, password: "cobates123" }] }),
});
const created = (await create.json()).results?.[0];
console.log(`1) Buat akun     : ${create.status} → ${created?.ok ? `✅ ${created.username}/${created.password}` : "❌ " + JSON.stringify(created)}`);

// 2) siswa baru bisa login
const email = created.username + "@siswa.belajarceria.id";
const sesi1 = await login(email, "cobates123");
console.log(`2) Login siswa   : ${sesi1 ? "✅" : "❌"}`);

// 3) ganti password: lama salah ditolak, lama benar diterima, password baru berlaku
const cookieSiswa = cookieOf(sesi1);
const salah = await fetch("http://localhost:3000/api/student/password", {
  method: "POST", headers: { "Content-Type": "application/json", Cookie: cookieSiswa },
  body: JSON.stringify({ oldPassword: "ngasal", newPassword: "baru12345" }),
});
const benar = await fetch("http://localhost:3000/api/student/password", {
  method: "POST", headers: { "Content-Type": "application/json", Cookie: cookieSiswa },
  body: JSON.stringify({ oldPassword: "cobates123", newPassword: "baru12345" }),
});
const relogin = await login(email, "baru12345");
console.log(`3) Ganti password: lama-salah=${salah.status === 400 ? "ditolak ✅" : "❌"}, lama-benar=${benar.status === 200 ? "OK ✅" : "❌"}, login-baru=${relogin ? "✅" : "❌"}`);

// 4) siswa nonaktif diblokir proxy → redirect /login?arsip=1
const patch = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${sesi1.user.id}`, {
  method: "PATCH",
  headers: { apikey: KEY, Authorization: `Bearer ${adminSession.access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ aktif: false }),
});
const blocked = await fetch("http://localhost:3000/belajar", {
  headers: { Cookie: cookieOf(relogin) },
  redirect: "manual",
});
const loc = blocked.headers.get("location") ?? "";
console.log(`4) Blokir arsip  : patch=${patch.status}, akses /belajar → ${blocked.status} ${loc.includes("arsip=1") ? "redirect arsip ✅" : "❌ " + loc}`);

// 5) tutup + hapus tahun ajaran dummy (tanpa siswa — aman)
const mkTahun = await fetch(`${URL_BASE}/rest/v1/tahun_ajaran`, {
  method: "POST",
  headers: { apikey: KEY, Authorization: `Bearer ${adminSession.access_token}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ nama: "TEST/9999" }),
});
const dummy = (await mkTahun.json())[0];
const tutup = await fetch("http://localhost:3000/api/admin/tahun-ajaran", {
  method: "POST", headers: { "Content-Type": "application/json", Cookie: adminCookie },
  body: JSON.stringify({ tahunId: dummy.id }),
});
const tolakNama = await fetch("http://localhost:3000/api/admin/tahun-ajaran", {
  method: "DELETE", headers: { "Content-Type": "application/json", Cookie: adminCookie },
  body: JSON.stringify({ tahunId: dummy.id, namaKonfirmasi: "SALAH" }),
});
const hapus = await fetch("http://localhost:3000/api/admin/tahun-ajaran", {
  method: "DELETE", headers: { "Content-Type": "application/json", Cookie: adminCookie },
  body: JSON.stringify({ tahunId: dummy.id, namaKonfirmasi: "TEST/9999" }),
});
console.log(`5) Tahun ajaran  : tutup=${tutup.status === 200 ? "✅" : "❌"}, hapus-nama-salah=${tolakNama.status !== 200 ? "ditolak ✅" : "❌"}, hapus-nama-benar=${hapus.status === 200 ? "✅" : "❌"}`);

// 6) bersihkan: hapus akun siswa uji langsung dari DB
const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
await db.query("delete from auth.users where id=$1::uuid", [sesi1.user.id]);
await db.end();
console.log("6) Bersih-bersih : akun uji dihapus ✅");
