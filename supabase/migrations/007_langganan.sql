-- ============================================================
-- FASE 3 TAHAP 2 — Kolom tanggal jatuh tempo langganan guru
-- Jalankan: node scripts/run-sql.mjs supabase/migrations/007_langganan.sql
-- ============================================================
-- info_langganan tetap catatan bebas; langganan_sampai dipakai halaman
-- pengingat jatuh tempo agar tenggat bisa dihitung dengan pasti.
alter table public.profiles
  add column if not exists langganan_sampai date;
