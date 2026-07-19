// Tes end-to-end kedua mode AI di aplikasi: node scripts/test-app-ai.mjs
import { readFileSync } from "node:fs";

const envFile = readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envFile.split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const login = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@belajarceria.id", password: "admin123" }),
});
const session = await login.json();
const raw = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
const name = "sb-ermmuelgoghnklobagux-auth-token";
const CHUNK = 3180;
const cookies = [];
if (raw.length <= CHUNK) cookies.push(`${name}=${raw}`);
else for (let i = 0; i * CHUNK < raw.length; i++)
  cookies.push(`${name}.${i}=${raw.slice(i * CHUNK, (i + 1) * CHUNK)}`);

async function ask(mode, content) {
  const r = await fetch("http://localhost:3000/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies.join("; ") },
    body: JSON.stringify({ mode, messages: [{ role: "user", content }] }),
  });
  const b = await r.json();
  return { status: r.status, b };
}

const k = await ask("kreator", "Buatkan modul perkalian untuk kelas 2 dengan 3 soal PG dan 1 soal esai.");
console.log(
  "KREATOR:", k.status,
  k.b.draft
    ? `DRAFT OK — "${k.b.draft.judul_id}" (${k.b.draft.soal_pg?.length ?? 0} PG, ${k.b.draft.soal_esai?.length ?? 0} esai)`
    : (k.b.error ?? "tanpa draft (jawaban teks saja)")
);

const a = await ask("analis", "Sebutkan 1 insight singkat dari data belajar siswa.");
console.log("ANALIS :", a.status, (a.b.text ?? a.b.error ?? "").slice(0, 120).replace(/\n/g, " "));
