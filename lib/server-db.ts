import "server-only";
import { Client } from "pg";

/** Jalankan fn dengan koneksi Postgres langsung (pengganti service role key). */
export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end().catch(() => {});
  }
}

/** Buat user auth via SQL (auth.users + auth.identities). Balikan: id user. */
export async function createAuthUser(
  db: Client,
  email: string,
  password: string,
  meta: Record<string, string>
): Promise<string> {
  const { rows } = await db.query(
    `insert into auth.users
       (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
     values
       ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
        $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', $3::jsonb, now(), now(), '', '', '', '', '')
     returning id`,
    [email, password, JSON.stringify(meta)]
  );
  const uid = String(rows[0].id);
  await db.query(
    `insert into auth.identities
       (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values
       (gen_random_uuid(), $1::uuid, $1::uuid,
        jsonb_build_object('sub', $1, 'email', $2::text, 'email_verified', true),
        'email', now(), now(), now())`,
    [uid, email]
  );
  return uid;
}
