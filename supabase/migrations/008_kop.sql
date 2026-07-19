-- ============================================================
-- FASE 3 TAHAP 3 — Kop surat per guru
-- Jalankan: node scripts/run-sql.mjs supabase/migrations/008_kop.sql
-- ============================================================

create table if not exists public.kop_surat (
  guru_id uuid primary key default auth.uid()
    references public.profiles(id) on delete cascade,
  logo_url text,
  nama_instansi text not null default '',
  alamat text not null default '',
  telepon text not null default '',
  email text not null default '',
  baris_tambahan text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.kop_surat enable row level security;

drop policy if exists "kop_guru_own" on public.kop_surat;
create policy "kop_guru_own" on public.kop_surat
  for all
  using (public.is_guru() and guru_id = auth.uid())
  with check (public.is_guru() and guru_id = auth.uid());
