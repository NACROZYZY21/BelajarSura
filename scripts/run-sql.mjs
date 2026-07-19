// Jalankan file SQL ke database: node scripts/run-sql.mjs supabase/migrations/002_penilaian.sql
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = readFileSync(resolve(root, ".env.local"), "utf8");
const env = Object.fromEntries(
  envFile.split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const file = process.argv[2];
if (!file) {
  console.error("Pemakaian: node scripts/run-sql.mjs <file.sql>");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
try {
  await client.connect();
  await client.query(readFileSync(resolve(root, file), "utf8"));
  console.log(`✅ ${file} diterapkan.`);
} catch (e) {
  console.error(`❌ ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
