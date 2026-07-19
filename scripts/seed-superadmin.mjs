// Seed akun SUPERADMIN (jalankan SETELAH migration 006):
//   node scripts/seed-superadmin.mjs
// Email resmi satu-satunya: sultan.210403@gmail.com
import pg from "pg";
import { readFileSync } from "node:fs";

const envFile = readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envFile.split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const EMAIL = "sultan.210403@gmail.com";
const PASSWORD_AWAL = "SuperCeria#2026"; // WAJIB diganti setelah login pertama!

const db = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  const { rows: ex } = await db.query("select id from auth.users where email=$1", [EMAIL]);
  if (ex[0]) {
    await db.query("update public.profiles set role='superadmin' where id=$1::uuid", [ex[0].id]);
    console.log("= superadmin sudah ada:", EMAIL);
  } else {
    const { rows } = await db.query(
      `insert into auth.users
         (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
          $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}',
          '{"nama":"Superadmin","avatar":"🛡️"}', now(), now(), '', '', '', '', '')
       returning id`,
      [EMAIL, PASSWORD_AWAL]
    );
    const uid = String(rows[0].id);
    await db.query(
      `insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       values (gen_random_uuid(), $1::uuid, $1::uuid,
         jsonb_build_object('sub', $1, 'email', $2::text, 'email_verified', true), 'email', now(), now(), now())`,
      [uid, EMAIL]
    );
    // trigger handle_new_user sudah menetapkan role superadmin berdasar email
    console.log("+ superadmin dibuat:", EMAIL);
    console.log("  Password awal:", PASSWORD_AWAL, "(SEGERA ganti setelah login!)");
  }
} finally {
  await db.end();
}
