-- ============================================================
-- FASE 3 TAHAP 4 — Ujian UTS/UAS (bank soal, online + cetak)
-- Jalankan: node scripts/run-sql.mjs supabase/migrations/009_ujian.sql
-- ============================================================

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid references public.profiles(id) on delete cascade,
  nama text not null,
  jenis text not null default 'UTS' check (jenis in ('UTS','UAS','Lainnya')),
  subject_id uuid references public.subjects(id) on delete set null,
  tingkat_kelas int not null default 1 check (tingkat_kelas between 1 and 6),
  tahun_ajaran_id uuid references public.tahun_ajaran(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','terbit')),
  -- mode online
  mode_online boolean not null default false,
  buka timestamptz,
  tutup timestamptz,
  durasi_menit int not null default 90,
  acak_soal boolean not null default false,
  acak_opsi boolean not null default false,
  peserta_kelas int[] not null default '{}',   -- kosong = semua kelas
  peserta_siswa uuid[] not null default '{}',  -- kosong = semua siswa (sesuai kelas)
  created_at timestamptz not null default now()
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid references public.profiles(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  -- soal dari bank modul (null = soal khusus ujian, disimpan inline)
  question_id uuid references public.questions(id) on delete cascade,
  tipe text check (tipe in ('pg','esai')),
  pertanyaan_id text,
  pertanyaan_en text,
  opsi jsonb,
  jawaban_benar text,
  gambar_url text,
  poin int not null default 10,   -- bobot KHUSUS ujian ini
  urutan int not null default 0
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid references public.profiles(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  mulai timestamptz not null default now(),
  selesai timestamptz,
  status text not null default 'berjalan' check (status in ('berjalan','selesai')),
  jawaban jsonb not null default '{}',       -- {exam_question_id: jawaban}
  ragu jsonb not null default '[]',          -- [exam_question_id]
  hasil jsonb not null default '{}',         -- {exam_question_id: {benar, poin}}
  poin_esai jsonb not null default '{}',     -- {exam_question_id: {poin, komentar}}
  nilai_pg numeric not null default 0,
  nilai numeric,                              -- total (pg + esai setelah review)
  unique (exam_id, student_id)
);

create index if not exists idx_exams_guru on public.exams (guru_id);
create index if not exists idx_eq_exam on public.exam_questions (exam_id, urutan);
create index if not exists idx_att_exam on public.exam_attempts (exam_id);

-- trigger tenant + tahun ajaran otomatis
drop trigger if exists trg_guru_exams on public.exams;
create trigger trg_guru_exams before insert on public.exams
  for each row execute function public.set_guru_id();
drop trigger if exists trg_guru_eq on public.exam_questions;
create trigger trg_guru_eq before insert on public.exam_questions
  for each row execute function public.set_guru_id();
drop trigger if exists trg_guru_att on public.exam_attempts;
create trigger trg_guru_att before insert on public.exam_attempts
  for each row execute function public.set_guru_id();

create or replace function public.set_exam_tahun()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tahun_ajaran_id is null then
    select id into new.tahun_ajaran_id from public.tahun_ajaran
    where status = 'aktif' and guru_id = new.guru_id limit 1;
  end if;
  return new;
end $$;
drop trigger if exists trg_tahun_exams on public.exams;
create trigger trg_tahun_exams before insert on public.exams
  for each row execute function public.set_exam_tahun();

-- ---------- RLS ----------
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;

-- exams: guru penuh; siswa hanya melihat ujian TERBIT+ONLINE milik gurunya
-- yang ia menjadi pesertanya (soal & jawaban TIDAK lewat sini — lewat API server)
drop policy if exists "exams_guru" on public.exams;
create policy "exams_guru" on public.exams for all
  using (public.is_guru() and guru_id = auth.uid())
  with check (public.is_guru() and (guru_id is null or guru_id = auth.uid()));
drop policy if exists "exams_siswa_read" on public.exams;
create policy "exams_siswa_read" on public.exams for select
  using (
    guru_id = public.tenant_id() and status = 'terbit' and mode_online
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'siswa'
        and (
          (cardinality(peserta_kelas) = 0 and cardinality(peserta_siswa) = 0)
          or p.kelas = any(peserta_kelas)
          or p.id = any(peserta_siswa)
        )
    )
  );

-- exam_questions: HANYA guru (siswa mengambil soal via API server tanpa kunci)
drop policy if exists "eq_guru" on public.exam_questions;
create policy "eq_guru" on public.exam_questions for all
  using (public.is_guru() and guru_id = auth.uid())
  with check (public.is_guru() and (guru_id is null or guru_id = auth.uid()));

-- exam_attempts: siswa lihat miliknya (nilai/hasil); tulis via API server; guru penuh
drop policy if exists "att_siswa_read" on public.exam_attempts;
create policy "att_siswa_read" on public.exam_attempts for select
  using (student_id = auth.uid() and guru_id = public.tenant_id());
drop policy if exists "att_guru" on public.exam_attempts;
create policy "att_guru" on public.exam_attempts for all
  using (public.is_guru() and guru_id = auth.uid());
