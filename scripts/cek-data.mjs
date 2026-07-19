// Inspeksi cepat isi database: node scripts/cek-data.mjs
import pg from "pg";
import { readFileSync } from "node:fs";

const envFile = readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envFile.split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const subs = await db.query("select id, nama_id, urutan from public.subjects order by urutan, nama_id");
console.log("SUBJECTS (" + subs.rows.length + "):");
subs.rows.forEach((s) => console.log("  -", s.nama_id, "(urutan", s.urutan + ") id=" + s.id.slice(0, 8)));

const st = await db.query("select nama, kelas, aktif, xp from public.profiles where role='student' order by nama");
console.log("STUDENTS (" + st.rows.length + "):");
st.rows.forEach((s) => console.log("  -", s.nama, "k" + s.kelas, s.aktif ? "aktif" : "ARSIP", s.xp + "xp"));

const es = await db.query("select status_review, count(*)::int n from public.essay_submissions group by status_review");
console.log("ESSAY:", JSON.stringify(es.rows));

const mods = await db.query(
  "select s.nama_id, count(*)::int n from public.modules m join public.subjects s on s.id=m.subject_id group by s.nama_id order by n desc"
);
console.log("MODUL PER MAPEL:");
mods.rows.forEach((m) => console.log("  -", m.nama_id + ":", m.n));

await db.end();
