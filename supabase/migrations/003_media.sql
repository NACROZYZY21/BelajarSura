-- ============================================================
-- FASE 2 TAHAP 2 — Gambar di soal & materi (Supabase Storage)
-- Jalankan di Supabase SQL Editor (atau: node scripts/run-sql.mjs supabase/migrations/003_media.sql)
-- ============================================================

-- gambar opsional per soal (PG & esai)
alter table public.questions
  add column if not exists gambar_url text;

-- bucket media: PUBLIC untuk baca (materi belajar, bukan data sensitif —
-- URL publik sederhana untuk siswa & ekspor dokumen), TULIS hanya admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media-belajar', 'media-belajar', true,
  5242880,                                   -- maks 5 MB per file
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- kebijakan akses objek storage
drop policy if exists "media_read" on storage.objects;
create policy "media_read" on storage.objects
  for select using (bucket_id = 'media-belajar');

drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert" on storage.objects
  for insert with check (bucket_id = 'media-belajar' and public.is_admin());

drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update" on storage.objects
  for update using (bucket_id = 'media-belajar' and public.is_admin());

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete" on storage.objects
  for delete using (bucket_id = 'media-belajar' and public.is_admin());
