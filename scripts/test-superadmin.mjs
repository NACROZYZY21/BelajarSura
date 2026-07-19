// Tes end-to-end Tahap 2 (superadmin): node scripts/test-superadmin.mjs
// (dev server harus jalan di localhost:3000)
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
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return r.ok ? await r.json() : null;
}
function cookieOf(session) {
  const raw = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const name = "sb-ermmuelgoghnklobagux-auth-token";
  const CHUNK = 3180, cookies = [];
  if (raw.length <= CHUNK) cookies.push(`${name}=${raw}`);
  else for (let i = 0; i * CHUNK < raw.length; i++)
    cookies.push(`${name}.${i}=${raw.slice(i * CHUNK, (i + 1) * CHUNK)}`);
  return cookies.join("; ");
}
const api = (cookie) => (path, method = "GET", body) =>
  fetch(`http://localhost:3000${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
const cek = (label, kondisi, detail = "") =>
  console.log(`${kondisi ? "✅" : "❌ GAGAL"} ${label}${detail ? " — " + detail : ""}`);

console.log("=== TES SUPERADMIN (TAHAP 2) ===\n");

const superSes = await login("sultan.210403@gmail.com", "SuperCeria#2026");
cek("Superadmin login", !!superSes);
const asSuper = api(cookieOf(superSes));

// 1) daftarkan guru baru
const buat = await asSuper("/api/superadmin/guru", "POST", {
  nama: "Guru Uji SaaS", email: "guru.uji@tes.belajarceria.id", password: "gurubaru123",
  info_langganan: "Mulai Jul 2026, Rp50rb/bln", langganan_sampai: "2026-08-01",
});
const buatJson = await buat.json();
cek("Superadmin mendaftarkan guru", buat.status === 200, JSON.stringify(buatJson).slice(0, 80));
const guruId = buatJson.id;

// 2) guru baru bisa login & profilnya benar
const guruSes = await login("guru.uji@tes.belajarceria.id", "gurubaru123");
cek("Guru baru bisa login", !!guruSes);
const { rows: prow } = await db.query(
  "select role, status_akun, info_langganan, langganan_sampai from public.profiles where id=$1::uuid", [guruId]);
cek("Profil guru benar (role, status, langganan)",
  prow[0]?.role === "guru" && prow[0]?.status_akun === "aktif" && prow[0]?.langganan_sampai !== null,
  JSON.stringify(prow[0]));

// 3) statistik pemakaian
const stats = await asSuper(`/api/superadmin/guru?id=${guruId}`);
const statsJson = await stats.json();
cek("Statistik pemakaian guru", stats.status === 200 && statsJson.siswa === 0, JSON.stringify(statsJson).slice(0, 90));

// 4) reset password guru oleh superadmin (berjenjang: guru ✔)
const reset = await asSuper("/api/superadmin/guru", "PATCH", { guruId, newPassword: "resetulang99" });
cek("Reset password guru", reset.status === 200);
cek("Login dengan password hasil reset", !!(await login("guru.uji@tes.belajarceria.id", "resetulang99")));

// 5) berjenjang: superadmin TIDAK bisa reset password siswa lewat route ini
const { rows: siswaRow } = await db.query("select id from public.profiles where role='siswa' limit 1");
const resetSiswa = await asSuper("/api/superadmin/guru", "PATCH", { guruId: siswaRow[0].id, newPassword: "cobacoba1" });
cek("Reset siswa via route superadmin → DITOLAK", resetSiswa.status >= 400, `status ${resetSiswa.status}`);

// 6) guru biasa memanggil API superadmin → ditolak
const guruLamaSes = await login("admin@belajarceria.id", "admin123");
const asGuruLama = api(cookieOf(guruLamaSes));
const nakal = await asGuruLama("/api/superadmin/guru", "POST", { nama: "x", email: "x@x.com", password: "xxxxxx" });
cek("Guru biasa akses API superadmin → DITOLAK", nakal.status === 403, `status ${nakal.status}`);

// 7) nonaktifkan guru via RLS superadmin → login guru terblokir middleware
const off = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${guruId}`, {
  method: "PATCH",
  headers: { apikey: KEY, Authorization: `Bearer ${superSes.access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ status_akun: "nonaktif" }),
});
const guruSes2 = await login("guru.uji@tes.belajarceria.id", "resetulang99");
const blocked = await fetch("http://localhost:3000/admin", {
  headers: { Cookie: cookieOf(guruSes2) }, redirect: "manual",
});
cek("Superadmin menonaktifkan guru", off.status === 204);
cek("Guru nonaktif akses /admin → redirect login", blocked.status === 307 && (blocked.headers.get("location") ?? "").includes("nonaktif=1"),
  blocked.headers.get("location") ?? "");

// 8) bersih-bersih
await db.query("delete from auth.users where email='guru.uji@tes.belajarceria.id'");
console.log("\nBersih-bersih: guru uji dihapus.");
await db.end();
