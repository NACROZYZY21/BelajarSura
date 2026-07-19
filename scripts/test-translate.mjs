// Tes end-to-end /api/ai/translate: node scripts/test-translate.mjs
// (dev server harus jalan di localhost:3000)
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

const IMG = "https://contoh.supabase.co/storage/v1/object/public/media-belajar/soal/abc.webp";
const texts = [
  "Penjumlahan Ceria",
  `# Ayo Berhitung! 🔢\n\nLihat gambar di bawah ini:\n\n![gambar apel](${IMG})\n\n- **2 + 1 = 3**\n- Coba hitung sendiri ya!`,
  "Berapa hasil 2 + 3?",
  "empat",
  "lima",
  "enam",
  "tujuh",
];

const r = await fetch("http://localhost:3000/api/ai/translate", {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookies.join("; ") },
  body: JSON.stringify({ texts }),
});
const b = await r.json();
console.log("STATUS:", r.status);
if (!r.ok) {
  console.log("ERROR:", b.error);
  process.exit(1);
}
const out = b.translations;
console.log("Jumlah elemen sama :", out.length === texts.length ? "✅" : "❌", `(${out.length}/${texts.length})`);
console.log("URL gambar utuh    :", out[1].includes(IMG) ? "✅" : "❌");
console.log("Markdown terjaga   :", /#/.test(out[1]) && /\*\*/.test(out[1]) ? "✅" : "⚠️ cek manual");
console.log("\n--- Contoh hasil ---");
out.forEach((t, i) => console.log(`${i}. ${t.split("\n")[0].slice(0, 70)}`));
