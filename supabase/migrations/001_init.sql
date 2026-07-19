-- ============================================================
-- BELAJAR CERIA — Skema awal + RLS
-- Jalankan di Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- TABEL ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('admin','student')),
  nama text not null,
  kelas int check (kelas between 1 and 6),
  avatar text not null default '🦊',
  xp int not null default 0,
  streak int not null default 0,
  last_active date,
  bahasa text not null default 'id' check (bahasa in ('id','en')),
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  nama_id text not null,
  nama_en text not null,
  ikon text not null default '📚',
  warna text not null default '#ffc21f',
  urutan int not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  tingkat_kelas int not null check (tingkat_kelas between 1 and 6),
  judul_id text not null,
  judul_en text not null default '',
  materi_id text not null default '',
  materi_en text not null default '',
  urutan int not null default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  dibuat_oleh_ai boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  tipe text not null check (tipe in ('pg','esai')),
  pertanyaan_id text not null,
  pertanyaan_en text not null default '',
  opsi jsonb,                -- pg: {"id": ["a","b","c","d"], "en": [...]}
  jawaban_benar text,        -- pg: indeks opsi ("0".."3"); esai isian: jawaban singkat; null = review manual
  poin int not null default 10,
  urutan int not null default 0
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id) on delete cascade,
  tipe_game text not null check (tipe_game in
    ('tebak_huruf','susun_suku_kata','cocokkan','hitung_benda','memory')),
  config jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  status text not null default 'berjalan' check (status in ('berjalan','selesai')),
  skor int not null default 0,
  bintang int not null default 0 check (bintang between 0 and 3),
  jawaban jsonb not null default '[]',
  selesai_pada timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, module_id)
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('kreator','analis')),
  judul text not null default 'Percakapan baru',
  messages jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama_id text not null,
  nama_en text not null,
  ikon text not null default '🏅',
  deskripsi_id text not null default '',
  deskripsi_en text not null default '',
  xp_syarat int not null default 0
);

create table public.student_badges (
  student_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  diperoleh_pada timestamptz not null default now(),
  primary key (student_id, badge_id)
);

create table public.app_settings (
  key text primary key,
  value jsonb not null
);

insert into public.app_settings (key, value) values ('leaderboard_aktif', 'true');

create index idx_modules_subject on public.modules (subject_id, tingkat_kelas, urutan);
create index idx_questions_module on public.questions (module_id, urutan);
create index idx_progress_student on public.student_progress (student_id);
create index idx_progress_module on public.student_progress (module_id);

-- ---------- TRIGGER: buat profil otomatis saat user auth dibuat ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, nama, kelas, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'kelas', '')::int,
    coalesce(new.raw_user_meta_data->>'avatar', '🦊')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- HELPER RLS ----------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- ROW LEVEL SECURITY ----------

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.modules enable row level security;
alter table public.questions enable row level security;
alter table public.games enable row level security;
alter table public.student_progress enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.badges enable row level security;
alter table public.student_badges enable row level security;
alter table public.app_settings enable row level security;

-- profiles: baca & ubah milik sendiri; admin akses penuh
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin());

-- subjects: semua user login boleh baca yang aktif; admin penuh
create policy "subjects_read" on public.subjects
  for select using (auth.uid() is not null and (aktif or public.is_admin()));
create policy "subjects_admin_write" on public.subjects
  for all using (public.is_admin());

-- modules: siswa hanya lihat published; admin penuh
create policy "modules_read" on public.modules
  for select using (auth.uid() is not null and (status = 'published' or public.is_admin()));
create policy "modules_admin_write" on public.modules
  for all using (public.is_admin());

-- questions & games: ikut modulnya
create policy "questions_read" on public.questions
  for select using (
    auth.uid() is not null and (
      public.is_admin() or
      exists (select 1 from public.modules m where m.id = module_id and m.status = 'published')
    )
  );
create policy "questions_admin_write" on public.questions
  for all using (public.is_admin());

create policy "games_read" on public.games
  for select using (
    auth.uid() is not null and (
      public.is_admin() or module_id is null or
      exists (select 1 from public.modules m where m.id = module_id and m.status = 'published')
    )
  );
create policy "games_admin_write" on public.games
  for all using (public.is_admin());

-- student_progress: siswa kelola miliknya sendiri; admin baca semua
create policy "progress_select" on public.student_progress
  for select using (student_id = auth.uid() or public.is_admin());
create policy "progress_insert_own" on public.student_progress
  for insert with check (student_id = auth.uid());
create policy "progress_update_own" on public.student_progress
  for update using (student_id = auth.uid());

-- ai_conversations: hanya admin
create policy "ai_admin_only" on public.ai_conversations
  for all using (public.is_admin() and admin_id = auth.uid());

-- badges: semua boleh baca; admin kelola
create policy "badges_read" on public.badges
  for select using (auth.uid() is not null);
create policy "badges_admin_write" on public.badges
  for all using (public.is_admin());

create policy "student_badges_select" on public.student_badges
  for select using (student_id = auth.uid() or public.is_admin());
create policy "student_badges_insert_own" on public.student_badges
  for insert with check (student_id = auth.uid());

-- app_settings: semua baca; admin tulis
create policy "settings_read" on public.app_settings
  for select using (auth.uid() is not null);
create policy "settings_admin_write" on public.app_settings
  for all using (public.is_admin());

-- ---------- LEADERBOARD (security definer agar siswa bisa lihat teman sekelas) ----------

create or replace function public.get_leaderboard(p_kelas int)
returns table (nama text, avatar text, xp int, streak int)
language sql stable security definer set search_path = public
as $$
  select p.nama, p.avatar, p.xp, p.streak
  from public.profiles p
  where p.role = 'student' and p.kelas = p_kelas
    and coalesce((select (value)::boolean from public.app_settings where key = 'leaderboard_aktif'), true)
  order by p.xp desc
  limit 20;
$$;
