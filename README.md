# 🐥 Belajar Ceria

Platform belajar interaktif untuk anak SD (kelas 1–6) — bilingual 🇮🇩/🇬🇧, penuh animasi, gamifikasi, dan AI Agent untuk guru.

**Stack:** Next.js (App Router) + TypeScript · Tailwind CSS + Framer Motion · Supabase (Auth, PostgreSQL, RLS) · OpenRouter (default: Claude Haiku 4.5) · Web Speech API (TTS gratis).

---

## 🚀 Setup (sekali saja)

### 1. Isi API key di `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # Supabase → Settings → API Keys
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
OPENROUTER_API_KEY=sk-or-v1-...                    # https://openrouter.ai/keys
OPENROUTER_MODEL=anthropic/claude-haiku-4.5        # bisa diganti model lain
```

> ⚠️ Jangan pernah commit `.env.local` (sudah ada di `.gitignore`).
> `DATABASE_URL` dan `OPENROUTER_API_KEY` hanya dipakai di server.
> Catatan: tidak ada model Claude yang gratis di OpenRouter; alternatif gratis
> misalnya `google/gemini-2.0-flash-exp:free`.

### 2. Setup database (migration + seed)

```bash
node scripts/setup-db.mjs        # migration 001 + akun & konten dasar
node scripts/run-sql.mjs supabase/migrations/002_penilaian.sql
node scripts/run-sql.mjs supabase/migrations/003_media.sql
node scripts/run-sql.mjs supabase/migrations/004_game_baru.sql
node scripts/run-sql.mjs supabase/migrations/005_tahun_ajaran.sql
node scripts/seed-lengkap.mjs    # seed lengkap (lihat di bawah)
```

Semua script **idempotent** — aman dijalankan berulang, tidak menduplikasi data.
(Alternatif: jalankan file SQL migration di Supabase Dashboard → SQL Editor.)

**Seed lengkap** (`seed-lengkap.mjs`) mengisi: **10 mata pelajaran** (ikon & warna
berbeda), **±50 modul published** kelas 1–6 (materi + 5 PG + 2 esai, bobot total 100),
konten **11 game** (≥10 item per game), **10 badge**, **10 siswa** dengan XP/level
bervariasi + progress belajar realistis + antrian review esai terisi, serta tahun
ajaran aktif **2026/2027** dan arsip **2025/2026** berisi 3 alumni.

#### 🔑 Kredensial

> Fase 3: sistem kini **multi-tenant per guru** (SaaS). Role: `superadmin` → `guru` → `siswa`.
> Migration terbaru: `node scripts/run-sql.mjs supabase/migrations/006_multi_tenant.sql`
> lalu `node scripts/seed-superadmin.mjs`.

| Role  | Login | Password |
|-------|-------|----------|
| **Superadmin** | `sultan.210403@gmail.com` | `SuperCeria#2026` ⚠️ ganti setelah login pertama (menu 🔑) |
| **Guru** (tenant pertama, data lengkap) | `admin@belajarceria.id` | `admin123` |
| **Guru contoh aktif** | `sinta@guru.belajarceria.id` | `gurusinta123` — siswa: `lala`,`momo`,`nino` / `belajar123` |
| **Guru contoh NONAKTIF** (uji blokir) | `rahmat@guru.belajarceria.id` | `gururahmat123` — siswa: `opik`,`putri` |
| Siswa | `aisyah`, `budi`, `citra`, `dimas`, `eka`, `fajar`, `gita`, `hasan`, `intan`, `joko`, `sari` | `belajar123` |
| Alumni (arsip, tidak bisa login) | `rudi`, `wati`, `yusuf` | `belajar123` |

(Siswa cukup mengetik nama pengguna — domain email ditambahkan otomatis.
Cek isi database kapan saja: `node scripts/cek-data.mjs`.)

### 3. Jalankan

```bash
npm run dev
```

Buka http://localhost:3000 → login sebagai siswa (`/belajar`) atau admin (`/admin`).

---

## 🗺️ Fitur

**Siswa** — peta petualangan modul berkelok (terkunci bertahap), materi dengan tombol 🔊 TTS, kuis PG dengan confetti & maskot, soal isian, 5 game (Tebak Huruf, Susun Suku Kata, Cocokkan Gambar & Kata, Hitung Benda, Memory), XP + level + evolusi maskot, bintang 1–3, streak harian 🔥, badge, avatar unlock, leaderboard kelas, saran remedial otomatis.

**Admin** — dashboard statistik + grafik, CRUD mapel & modul (editor soal + game), monitoring siswa (detail progres, grafik skor, topik sering salah, reset password), laporan + ekspor CSV, toggle leaderboard, dan **AI Agent** 2 mode:
- **Kreator Modul** — minta AI membuatkan draft modul lengkap → preview → simpan sebagai draft → publish.
- **Analis Data** — AI membaca data progres terkini dari database dan memberi insight & rekomendasi.

## 📁 Struktur penting

```
app/belajar/*        interface siswa
app/admin/*          interface admin
app/api/ai           proxy OpenRouter (server-only)
app/api/admin/*      reset password via koneksi Postgres langsung
components/games/*   5 game interaktif
lib/                 supabase clients, i18n, gamifikasi, TTS, sfx
supabase/migrations  skema SQL + RLS
scripts/setup-db.mjs migration + seed (idempotent)
```
