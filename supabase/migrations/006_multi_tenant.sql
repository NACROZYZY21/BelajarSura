-- ============================================================
-- FASE 3 TAHAP 1 — Multi-tenant per guru (SaaS)
-- Jalankan: node scripts/run-sql.mjs supabase/migrations/006_multi_tenant.sql
-- (atau tempel di Supabase SQL Editor)
-- ============================================================

-- ---------- 1. ROLE BARU: superadmin | guru | siswa ----------
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'guru'  where role = 'admin';
update public.profiles set role = 'siswa' where role = 'student';
alter table public.profiles
  add constraint profiles_role_check check (role in ('superadmin','guru','siswa'));

alter table public.profiles
  add column if not exists guru_id uuid references public.profiles(id) on delete cascade,
  add column if not exists status_akun text not null default 'aktif'
    check (status_akun in ('aktif','nonaktif')),
  add column if not exists info_langganan text not null default '';

-- ---------- 2. KOLOM guru_id DI SEMUA TABEL DATA ----------
alter table public.subjects          add column if not exists guru_id uuid references public.profiles(id) on delete cascade;
alter table public.modules           add column if not exists guru_id uuid references public.profiles(id) on delete cascade;
alter table public.questions         add column if not exists guru_id uuid references public.profiles(id) on delete cascade;
alter table public.games             add column if not exists guru_id uuid references public.profiles(id) on delete cascade;
alter table public.student_progress  add column if not exists guru_id uuid references public.profiles(id) on delete cascade;
alter table public.essay_submissions add column if not exists guru_id uuid references public.profiles(id) on delete cascade;
alter table public.badges            add column if not exists guru_id uuid references public.profiles(id) on delete cascade;
alter table public.tahun_ajaran      add column if not exists guru_id uuid references public.profiles(id) on delete cascade;
alter table public.ai_conversations  add column if not exists guru_id uuid references public.profiles(id) on delete cascade;
alter table public.app_settings      add column if not exists guru_id uuid references public.profiles(id) on delete cascade;

-- badges.kode & tahun_ajaran.nama kini unik per guru, bukan global
alter table public.badges       drop constraint if exists badges_kode_key;
create unique index if not exists badges_kode_guru on public.badges (guru_id, kode);
alter table public.tahun_ajaran drop constraint if exists tahun_ajaran_nama_key;
create unique index if not exists tahun_nama_guru on public.tahun_ajaran (guru_id, nama);
alter table public.app_settings drop constraint if exists app_settings_pkey;
alter table public.app_settings add column if not exists id uuid primary key default gen_random_uuid();
create unique index if not exists settings_key_guru on public.app_settings (guru_id, key);

create index if not exists idx_subjects_guru on public.subjects (guru_id);
create index if not exists idx_modules_guru on public.modules (guru_id);
create index if not exists idx_progress_guru on public.student_progress (guru_id);
create index if not exists idx_profiles_guru on public.profiles (guru_id);

-- ---------- 3. MIGRASI DATA LAMA → GURU PERTAMA ----------
do $$
declare g uuid;
begin
  select id into g from public.profiles where role = 'guru' order by created_at limit 1;
  if g is not null then
    update public.profiles          set guru_id = g where role = 'siswa' and guru_id is null;
    update public.subjects          set guru_id = g where guru_id is null;
    update public.modules           set guru_id = g where guru_id is null;
    update public.questions         set guru_id = g where guru_id is null;
    update public.games             set guru_id = g where guru_id is null;
    update public.student_progress  set guru_id = g where guru_id is null;
    update public.essay_submissions set guru_id = g where guru_id is null;
    update public.badges            set guru_id = g where guru_id is null;
    update public.tahun_ajaran      set guru_id = g where guru_id is null;
    update public.ai_conversations  set guru_id = g where guru_id is null;
    update public.app_settings      set guru_id = g where guru_id is null;
  end if;
end $$;

-- ---------- 4. FUNGSI TENANT ----------
-- tenant_id(): id guru pemilik data untuk user yang sedang login.
-- Mengembalikan NULL bila guru ybs NONAKTIF → semua policy tenant otomatis gagal.
create or replace function public.tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select case
    when p.role = 'guru'  and p.status_akun = 'aktif' then p.id
    when p.role = 'siswa' and p.aktif
      and exists (select 1 from public.profiles g
                  where g.id = p.guru_id and g.status_akun = 'aktif')
      then p.guru_id
    else null
  end
  from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'superadmin');
$$;

create or replace function public.is_guru()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'guru' and status_akun = 'aktif');
$$;

-- kompatibilitas: is_admin() lama = guru aktif (dipakai policy storage)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_guru();
$$;

-- ---------- 5. TRIGGER AUTO-ISI guru_id (kode aplikasi tak perlu diubah) ----------
create or replace function public.set_guru_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.guru_id is null then
    new.guru_id := public.tenant_id();
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['subjects','modules','questions','games','student_progress',
                           'essay_submissions','badges','tahun_ajaran','ai_conversations','app_settings']
  loop
    execute format('drop trigger if exists trg_guru_%s on public.%s', t, t);
    execute format('create trigger trg_guru_%s before insert on public.%s
                    for each row execute function public.set_guru_id()', t, t);
  end loop;
end $$;

-- ---------- 6. TRIGGER USER BARU + PENJAGA SUPERADMIN ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, nama, kelas, avatar, guru_id)
  values (
    new.id,
    case
      when new.email = 'sultan.210403@gmail.com' then 'superadmin'
      when coalesce(new.raw_user_meta_data->>'role','') in ('guru','admin') then 'guru'
      else 'siswa'
    end,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'kelas', '')::int,
    coalesce(new.raw_user_meta_data->>'avatar', '🦊'),
    nullif(new.raw_user_meta_data->>'guru_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- HANYA email superadmin resmi yang boleh ber-role superadmin (validasi di DB)
create or replace function public.guard_superadmin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'superadmin' then
    if not exists (select 1 from auth.users u
                   where u.id = new.id and u.email = 'sultan.210403@gmail.com') then
      raise exception 'Hanya email resmi yang boleh menjadi superadmin';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_superadmin on public.profiles;
create trigger trg_guard_superadmin before insert or update of role on public.profiles
  for each row execute function public.guard_superadmin();

-- ---------- 7. TULIS ULANG SEMUA POLICY (RLS TENANT KETAT) ----------
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- PROFILES: diri sendiri; guru → siswanya; superadmin → semua (manajemen akun)
create policy "profiles_select" on public.profiles for select using (
  id = auth.uid()
  or (public.is_guru() and guru_id = auth.uid())
  or public.is_superadmin()
);
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid());
create policy "profiles_guru_manage" on public.profiles for all using (
  public.is_guru() and guru_id = auth.uid() and role = 'siswa'
);
create policy "profiles_superadmin" on public.profiles for all using (public.is_superadmin());

-- SUBJECTS / MODULES / QUESTIONS / GAMES / BADGES / TAHUN / SETTINGS / AI:
-- baca: milik tenant sendiri; tulis: hanya guru pemilik
create policy "subjects_read" on public.subjects for select
  using (guru_id = public.tenant_id() and (aktif or public.is_guru()));
create policy "subjects_write" on public.subjects for all
  using (public.is_guru() and guru_id = auth.uid())
  with check (public.is_guru() and (guru_id is null or guru_id = auth.uid()));

create policy "modules_read" on public.modules for select
  using (guru_id = public.tenant_id() and (status = 'published' or public.is_guru()));
create policy "modules_write" on public.modules for all
  using (public.is_guru() and guru_id = auth.uid())
  with check (public.is_guru() and (guru_id is null or guru_id = auth.uid()));

create policy "questions_read" on public.questions for select
  using (guru_id = public.tenant_id() and (public.is_guru() or exists (
    select 1 from public.modules m where m.id = module_id and m.status = 'published')));
create policy "questions_write" on public.questions for all
  using (public.is_guru() and guru_id = auth.uid())
  with check (public.is_guru() and (guru_id is null or guru_id = auth.uid()));

create policy "games_read" on public.games for select
  using (guru_id = public.tenant_id());
create policy "games_write" on public.games for all
  using (public.is_guru() and guru_id = auth.uid())
  with check (public.is_guru() and (guru_id is null or guru_id = auth.uid()));

create policy "badges_read" on public.badges for select using (guru_id = public.tenant_id());
create policy "badges_write" on public.badges for all
  using (public.is_guru() and guru_id = auth.uid())
  with check (public.is_guru() and (guru_id is null or guru_id = auth.uid()));

create policy "tahun_read" on public.tahun_ajaran for select using (guru_id = public.tenant_id());
create policy "tahun_write" on public.tahun_ajaran for all
  using (public.is_guru() and guru_id = auth.uid())
  with check (public.is_guru() and (guru_id is null or guru_id = auth.uid()));

create policy "settings_read" on public.app_settings for select using (guru_id = public.tenant_id());
create policy "settings_write" on public.app_settings for all
  using (public.is_guru() and guru_id = auth.uid())
  with check (public.is_guru() and (guru_id is null or guru_id = auth.uid()));

create policy "ai_guru_own" on public.ai_conversations for all
  using (public.is_guru() and admin_id = auth.uid())
  with check (public.is_guru() and admin_id = auth.uid());

-- PROGRESS: siswa kelola miliknya (dalam tenant aktif); guru kelola milik tenant-nya
create policy "progress_siswa" on public.student_progress for all
  using (student_id = auth.uid() and guru_id = public.tenant_id())
  with check (student_id = auth.uid() and (guru_id is null or guru_id = public.tenant_id()));
create policy "progress_guru" on public.student_progress for all
  using (public.is_guru() and guru_id = auth.uid());

-- ESSAY: siswa kirim/lihat miliknya; guru menilai milik tenant-nya
create policy "essay_siswa_select" on public.essay_submissions for select
  using (student_id = auth.uid() and guru_id = public.tenant_id());
create policy "essay_siswa_insert" on public.essay_submissions for insert
  with check (student_id = auth.uid() and (guru_id is null or guru_id = public.tenant_id()));
create policy "essay_siswa_update" on public.essay_submissions for update
  using (student_id = auth.uid() and status_review = 'menunggu_review'
         and guru_id = public.tenant_id());
create policy "essay_guru" on public.essay_submissions for all
  using (public.is_guru() and guru_id = auth.uid());

-- STUDENT_BADGES: siswa miliknya; guru lihat milik siswanya
create policy "sbadges_select" on public.student_badges for select using (
  student_id = auth.uid()
  or (public.is_guru() and exists (
      select 1 from public.profiles p where p.id = student_id and p.guru_id = auth.uid()))
);
create policy "sbadges_insert" on public.student_badges for insert
  with check (student_id = auth.uid() and public.tenant_id() is not null);

-- ---------- 8. LEADERBOARD PER TENANT ----------
create or replace function public.get_leaderboard(p_kelas int)
returns table (nama text, avatar text, xp int, streak int)
language sql stable security definer set search_path = public as $$
  select p.nama, p.avatar, p.xp, p.streak
  from public.profiles p
  where p.role = 'siswa' and p.kelas = p_kelas
    and p.guru_id = public.tenant_id()
    and coalesce((select (value)::boolean from public.app_settings
                  where key = 'leaderboard_aktif' and guru_id = public.tenant_id()), true)
  order by p.xp desc
  limit 20;
$$;
