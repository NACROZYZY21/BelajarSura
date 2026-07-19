// Tes kop surat + isolasi tenant-nya: node scripts/test-kop.mjs
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

async function mkGuru(email) {
  const { rows } = await db.query(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       $1, extensions.crypt('ujicoba123', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{"role":"guru","nama":"Guru Kop"}', now(), now(), '', '', '', '', '')
     returning id`, [email]);
  const uid = String(rows[0].id);
  await db.query(
    `insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values (gen_random_uuid(), $1::uuid, $1::uuid,
       jsonb_build_object('sub', $1, 'email', $2::text, 'email_verified', true), 'email', now(), now(), now())`,
    [uid, email]);
  return uid;
}
async function login(email) {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "ujicoba123" }),
  });
  return r.ok ? (await r.json()).access_token : null;
}
const rest = (t) => async (path, opts = {}) => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=representation", ...opts.headers },
  });
  const text = await r.text();
  return { status: r.status, data: text ? JSON.parse(text) : null };
};
const cek = (l, k, d = "") => console.log(`${k ? "✅" : "❌ GAGAL"} ${l}${d ? " — " + d : ""}`);

console.log("=== TES KOP SURAT (TAHAP 3) ===\n");
const idA = await mkGuru("kop.a@uji.belajarceria.id");
await mkGuru("kop.b@uji.belajarceria.id");
const asA = rest(await login("kop.a@uji.belajarceria.id"));
const asB = rest(await login("kop.b@uji.belajarceria.id"));

// guru A menyimpan kop (guru_id default auth.uid())
const simpan = await asA("kop_surat", { method: "POST", body: JSON.stringify({
  nama_instansi: "SD CERIA NUSANTARA A", alamat: "Jl. Melati No. 1", telepon: "0812345", email: "sd@a.sch.id",
}) });
cek("Guru A menyimpan kop surat", simpan.status === 201, `status ${simpan.status}`);

const bacaA = await asA("kop_surat?select=nama_instansi");
cek("Guru A membaca kopnya sendiri", bacaA.data?.[0]?.nama_instansi === "SD CERIA NUSANTARA A");

const bacaB = await asB("kop_surat?select=nama_instansi");
cek("Guru B TIDAK melihat kop Guru A", (bacaB.data ?? []).length === 0, JSON.stringify(bacaB.data));

const susup = await asB(`kop_surat`, { method: "POST", body: JSON.stringify({
  guru_id: idA, nama_instansi: "DISUSUPI",
}) });
cek("Guru B menimpa kop A → DITOLAK", susup.status >= 400, `status ${susup.status}`);

const ubah = await asB(`kop_surat?guru_id=eq.${idA}`, { method: "PATCH", body: JSON.stringify({ nama_instansi: "DIUBAH-B" }) });
const cekUbah = await asA("kop_surat?select=nama_instansi");
cek("Guru B mengubah kop A → TIDAK berefek", cekUbah.data?.[0]?.nama_instansi === "SD CERIA NUSANTARA A", `patch status ${ubah.status}`);

await db.query("delete from auth.users where email like 'kop.%@uji.belajarceria.id'");
console.log("\nBersih-bersih selesai.");
await db.end();
