// Setup database Belajar Ceria — migration + akun demo + seed konten, semua via
// koneksi Postgres langsung (pooler):  node scripts/setup-db.mjs
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SUBJECTS, USERS, BADGES, GLOBAL_GAMES, MODULES } from "./seed-data.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// baca .env.local tanpa dependency dotenv
const envFile = readFileSync(resolve(root, ".env.local"), "utf8");
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

if (!env.DATABASE_URL) {
  console.error("❌ DATABASE_URL belum diisi di .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function tableExists(name) {
  const r = await client.query(
    "select 1 from information_schema.tables where table_schema='public' and table_name=$1",
    [name]
  );
  return r.rowCount > 0;
}

async function migrate() {
  if (await tableExists("profiles")) {
    console.log("1) Migration: tabel sudah ada, lewati.");
    return;
  }
  console.log("1) Menjalankan migration 001_init.sql ...");
  const sql = readFileSync(resolve(root, "supabase/migrations/001_init.sql"), "utf8");
  await client.query(sql);
  console.log("   ✅ skema + RLS dibuat");
}

async function createUsers() {
  console.log("2) Membuat akun demo ...");
  const ensureIdentity = async (uid, email) => {
    await client.query(
      `insert into auth.identities
         (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       select gen_random_uuid(), $1::uuid, $1::uuid,
              jsonb_build_object('sub', $1, 'email', $2::text, 'email_verified', true),
              'email', now(), now(), now()
       where not exists (
         select 1 from auth.identities where user_id = $1::uuid and provider = 'email'
       )`,
      [String(uid), email]
    );
  };

  for (const u of USERS) {
    const exists = await client.query("select id from auth.users where email=$1", [u.email]);
    if (exists.rowCount > 0) {
      await ensureIdentity(exists.rows[0].id, u.email);
      console.log(`   = sudah ada: ${u.email}`);
      continue;
    }
    // insert langsung ke auth.users + auth.identities (pengganti Admin API
    // karena service role key tidak tersedia). Trigger handle_new_user
    // otomatis membuat baris di public.profiles.
    const { rows } = await client.query(
      `insert into auth.users
         (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
       values
         ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
          $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', $3::jsonb, now(), now(), '', '', '', '', '')
       returning id`,
      [u.email, u.password, JSON.stringify(u.meta)]
    );
    const uid = rows[0].id;
    await ensureIdentity(uid, u.email);
    console.log(`   + ${u.email} (${u.meta.role})`);
  }
}

async function seedContent() {
  const { rows: subCount } = await client.query("select count(*)::int as n from public.subjects");
  if (subCount[0].n > 0) {
    console.log("3) Konten: sudah ada, lewati seed.");
    return;
  }
  console.log("3) Seed mapel, modul, soal, game, badge ...");

  const subjectIds = {};
  for (const [i, s] of SUBJECTS.entries()) {
    const { rows } = await client.query(
      `insert into public.subjects (nama_id, nama_en, ikon, warna, urutan)
       values ($1,$2,$3,$4,$5) returning id`,
      [s.nama_id, s.nama_en, s.ikon, s.warna, s.urutan]
    );
    subjectIds[i === 0 ? "bahasa" : "mtk"] = rows[0].id;
    console.log(`   + mapel: ${s.nama_id}`);
  }

  for (const m of MODULES) {
    const { rows } = await client.query(
      `insert into public.modules
         (subject_id, tingkat_kelas, judul_id, judul_en, materi_id, materi_en, urutan, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [subjectIds[m.subjectKey], m.tingkat_kelas, m.judul_id, m.judul_en, m.materi_id, m.materi_en, m.urutan, m.status]
    );
    const mid = rows[0].id;
    for (const [qi, q] of m.soal.entries()) {
      await client.query(
        `insert into public.questions
           (module_id, tipe, pertanyaan_id, pertanyaan_en, opsi, jawaban_benar, poin, urutan)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [mid, q.tipe, q.pertanyaan_id, q.pertanyaan_en, q.opsi ? JSON.stringify(q.opsi) : null, q.jawaban_benar, q.poin, qi + 1]
      );
    }
    for (const g of m.games ?? []) {
      await client.query(
        `insert into public.games (module_id, tipe_game, config) values ($1,$2,$3)`,
        [mid, g.tipe_game, JSON.stringify(g.config)]
      );
    }
    console.log(`   + modul: ${m.judul_id} (${m.soal.length} soal)`);
  }

  for (const g of GLOBAL_GAMES) {
    await client.query(
      `insert into public.games (module_id, tipe_game, config) values (null,$1,$2)`,
      [g.tipe_game, JSON.stringify(g.config)]
    );
  }
  console.log("   + 5 game global Zona Game");

  for (const b of BADGES) {
    await client.query(
      `insert into public.badges (kode, nama_id, nama_en, ikon, deskripsi_id, deskripsi_en, xp_syarat)
       values ($1,$2,$3,$4,$5,$6,$7) on conflict (kode) do nothing`,
      [b.kode, b.nama_id, b.nama_en, b.ikon, b.deskripsi_id, b.deskripsi_en, b.xp_syarat]
    );
  }
  console.log(`   + ${BADGES.length} badge`);
}

try {
  await client.connect();
  await migrate();
  await createUsers();
  await seedContent();
  console.log("\n✅ Database siap!");
  console.log("   Admin : admin@belajarceria.id / admin123");
  console.log("   Siswa : budi / belajar123 (kelas 1)");
  console.log("   Siswa : sari / belajar123 (kelas 2)");
} catch (e) {
  console.error("❌ Gagal:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
