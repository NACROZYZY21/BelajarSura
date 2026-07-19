-- ============================================================
-- FASE 2 TAHAP 1 — Sistem penilaian 100 poin + review esai
-- Jalankan di Supabase SQL Editor (atau: node scripts/run-sql.mjs supabase/migrations/002_penilaian.sql)
-- ============================================================

-- poin PG mentah tersimpan agar skor bisa dihitung ulang saat esai di-ACC
alter table public.student_progress
  add column if not exists poin_pg int not null default 0;

-- jawaban esai per soal — antre direview admin
create table if not exists public.essay_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  jawaban text not null,
  status_review text not null default 'menunggu_review'
    check (status_review in ('otomatis','menunggu_review','sudah_dinilai')),
  poin_diberikan int,
  komentar_admin text,
  direview_pada timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, question_id)
);

create index if not exists idx_essay_status on public.essay_submissions (status_review);
create index if not exists idx_essay_student on public.essay_submissions (student_id, module_id);

alter table public.essay_submissions enable row level security;

-- siswa: kirim & lihat jawaban sendiri; admin: akses penuh (termasuk memberi nilai)
create policy "essay_select" on public.essay_submissions
  for select using (student_id = auth.uid() or public.is_admin());
create policy "essay_insert_own" on public.essay_submissions
  for insert with check (student_id = auth.uid());
create policy "essay_upsert_own" on public.essay_submissions
  for update using (student_id = auth.uid() and status_review = 'menunggu_review');
create policy "essay_admin_all" on public.essay_submissions
  for all using (public.is_admin());

-- admin perlu bisa meng-update progress siswa saat ACC esai (hitung ulang skor)
create policy "progress_admin_update" on public.student_progress
  for update using (public.is_admin());
