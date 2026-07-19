-- ============================================================
-- FASE 3 TAHAP 5 — Perbaikan kepatuhan tenant
-- Jalankan: node scripts/run-sql.mjs supabase/migrations/010_tenant_fix.sql
-- ============================================================

-- set_tahun_ajaran kini memilih tahun aktif MILIK GURU pemilik progress
-- (sebelumnya bisa nyasar ke tahun ajaran guru lain).
create or replace function public.set_tahun_ajaran()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tahun_ajaran_id is null then
    select id into new.tahun_ajaran_id from public.tahun_ajaran
    where status = 'aktif' and guru_id = new.guru_id
    limit 1;
  end if;
  return new;
end $$;

-- bersihkan duplikat app_settings per (guru_id, key) bila sempat terjadi
delete from public.app_settings a
using public.app_settings b
where a.key = b.key
  and a.guru_id is not distinct from b.guru_id
  and a.id > b.id;
