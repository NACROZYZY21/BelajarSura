-- ============================================================
-- FASE 2 TAHAP 6 — Tahun ajaran, arsip, & status akun siswa
-- Jalankan di Supabase SQL Editor (atau: node scripts/run-sql.mjs supabase/migrations/005_tahun_ajaran.sql)
-- ============================================================

create table if not exists public.tahun_ajaran (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,                 -- contoh: "2025/2026"
  status text not null default 'aktif' check (status in ('aktif','diarsipkan')),
  created_at timestamptz not null default now(),
  diarsipkan_pada timestamptz
);

alter table public.profiles
  add column if not exists tahun_ajaran_id uuid references public.tahun_ajaran(id) on delete set null,
  add column if not exists aktif boolean not null default true;

alter table public.student_progress
  add column if not exists tahun_ajaran_id uuid references public.tahun_ajaran(id) on delete set null;

create index if not exists idx_profiles_tahun on public.profiles (tahun_ajaran_id);
create index if not exists idx_progress_tahun on public.student_progress (tahun_ajaran_id);

-- RLS
alter table public.tahun_ajaran enable row level security;
drop policy if exists "tahun_read" on public.tahun_ajaran;
create policy "tahun_read" on public.tahun_ajaran
  for select using (auth.uid() is not null);
drop policy if exists "tahun_admin_write" on public.tahun_ajaran;
create policy "tahun_admin_write" on public.tahun_ajaran
  for all using (public.is_admin());

-- tahun ajaran pertama: Juli-Desember → "YYYY/YYYY+1", Januari-Juni → "YYYY-1/YYYY"
insert into public.tahun_ajaran (nama)
select case
  when extract(month from now()) >= 7
    then extract(year from now())::int || '/' || (extract(year from now())::int + 1)
  else (extract(year from now())::int - 1) || '/' || extract(year from now())::int
end
where not exists (select 1 from public.tahun_ajaran);

-- ikat siswa & progress lama ke tahun ajaran aktif
update public.profiles
  set tahun_ajaran_id = (select id from public.tahun_ajaran where status = 'aktif' limit 1)
  where role = 'student' and tahun_ajaran_id is null;

update public.student_progress
  set tahun_ajaran_id = (select id from public.tahun_ajaran where status = 'aktif' limit 1)
  where tahun_ajaran_id is null;

-- isi otomatis tahun ajaran aktif pada progress baru
create or replace function public.set_tahun_ajaran()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.tahun_ajaran_id is null then
    new.tahun_ajaran_id := (select id from public.tahun_ajaran where status = 'aktif' limit 1);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_progress_tahun on public.student_progress;
create trigger trg_progress_tahun
  before insert on public.student_progress
  for each row execute function public.set_tahun_ajaran();
