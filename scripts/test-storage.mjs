// Tes policy bucket media-belajar: node scripts/test-storage.mjs
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
  return (await r.json()).access_token;
}

// PNG 1x1 piksel
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function upload(token, path) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/media-belajar/${path}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
    body: png,
  });
  return r.status;
}

const adminTok = await login("admin@belajarceria.id", "admin123");
const budiTok = await login("budi@siswa.belajarceria.id", "belajar123");

const s1 = await upload(adminTok, "tes/policy-check.png");
console.log(`1) Admin upload  → ${s1} ${s1 === 200 ? "✅ diizinkan" : "❌"}`);

const s2 = await upload(budiTok, "tes/hacker.png");
console.log(`2) Siswa upload  → ${s2} ${s2 === 403 || s2 === 400 ? "✅ DITOLAK (benar)" : "❌ HARUSNYA DITOLAK!"}`);

const pub = await fetch(`${URL_BASE}/storage/v1/object/public/media-belajar/tes/policy-check.png`);
console.log(`3) Baca publik   → ${pub.status} ${pub.status === 200 ? "✅ bisa dibaca" : "❌"}`);

// bersihkan file tes
const del = await fetch(`${URL_BASE}/storage/v1/object/media-belajar/tes/policy-check.png`, {
  method: "DELETE",
  headers: { apikey: KEY, Authorization: `Bearer ${adminTok}` },
});
console.log(`4) Admin hapus   → ${del.status} ${del.status === 200 ? "✅" : "❌"}`);
