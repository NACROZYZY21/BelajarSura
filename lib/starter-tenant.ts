import "server-only";
import type { Client } from "pg";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Konten awal Zona Game untuk tenant guru baru (11 tipe). */
const STARTER_GAMES: { tipe: string; config: any }[] = [
  { tipe: "tebak_huruf", config: { huruf: ["a", "b", "c", "d", "e", "i", "k", "m", "s", "u"] } },
  { tipe: "susun_suku_kata", config: { kata: [
    { kata: "baju", suku: ["ba", "ju"], emoji: "👕" }, { kata: "buku", suku: ["bu", "ku"], emoji: "📚" },
    { kata: "sapi", suku: ["sa", "pi"], emoji: "🐮" }, { kata: "bola", suku: ["bo", "la"], emoji: "⚽" },
    { kata: "sepatu", suku: ["se", "pa", "tu"], emoji: "👟" }, { kata: "kereta", suku: ["ke", "re", "ta"], emoji: "🚂" },
  ] } },
  { tipe: "cocokkan", config: { pasangan: [
    { emoji: "🍌", kata_id: "pisang", kata_en: "banana" }, { emoji: "🐘", kata_id: "gajah", kata_en: "elephant" },
    { emoji: "🌙", kata_id: "bulan", kata_en: "moon" }, { emoji: "🚗", kata_id: "mobil", kata_en: "car" },
    { emoji: "🏠", kata_id: "rumah", kata_en: "house" }, { emoji: "🐟", kata_id: "ikan", kata_en: "fish" },
  ] } },
  { tipe: "hitung_benda", config: { max: 10, emoji: ["🍎", "🐤", "⭐", "🎈", "🐠", "🍭"] } },
  { tipe: "memory", config: { pasangan: [["🐱", "🐱"], ["🐶", "🐶"], ["🐰", "🐰"], ["🦊", "🦊"], ["🐼", "🐼"], ["🐸", "🐸"]] } },
  { tipe: "baca_ucapkan", config: { items: [
    { teks_id: "Budi suka membaca buku", teks_en: "Budi likes to read books" },
    { teks_id: "Kucing itu tidur di atas meja", teks_en: "The cat sleeps on the table" },
    { teks_id: "Ibu memasak sayur di dapur", teks_en: "Mother cooks vegetables in the kitchen" },
    { teks_id: "Matahari terbit di sebelah timur", teks_en: "The sun rises in the east" },
    { teks_id: "Kami belajar bersama di sekolah", teks_en: "We study together at school" },
  ] } },
  { tipe: "tebak_kata_gambar", config: { items: [
    { emoji: "🍎", jawaban_id: "apel", jawaban_en: "apple" }, { emoji: "🐱", jawaban_id: "kucing", jawaban_en: "cat" },
    { emoji: "🏠", jawaban_id: "rumah", jawaban_en: "house" }, { emoji: "⚽", jawaban_id: "bola", jawaban_en: "ball" },
    { emoji: "🌙", jawaban_id: "bulan", jawaban_en: "moon" }, { emoji: "📚", jawaban_id: "buku", jawaban_en: "book" },
  ] } },
  { tipe: "urutkan_angka", config: { jumlah: 5, min: 1, max: 20, arah: "campur", ronde: 5 } },
  { tipe: "kuis_kilat", config: { waktu_per_soal: 10, items: [
    { soal_id: "3 + 4 = ?", soal_en: "3 + 4 = ?", opsi_id: ["6", "7", "8", "9"], opsi_en: ["6", "7", "8", "9"], benar: 1 },
    { soal_id: "10 - 6 = ?", soal_en: "10 - 6 = ?", opsi_id: ["2", "3", "4", "5"], opsi_en: ["2", "3", "4", "5"], benar: 2 },
    { soal_id: "5 × 2 = ?", soal_en: "5 × 2 = ?", opsi_id: ["10", "7", "12", "8"], opsi_en: ["10", "7", "12", "8"], benar: 0 },
    { soal_id: "Mana hewan?", soal_en: "Which is an animal?", opsi_id: ["🍎", "🐘", "🏠", "⚽"], opsi_en: ["🍎", "🐘", "🏠", "⚽"], benar: 1 },
    { soal_id: "8 + 7 = ?", soal_en: "8 + 7 = ?", opsi_id: ["14", "15", "16", "13"], opsi_en: ["14", "15", "16", "13"], benar: 1 },
  ] } },
  { tipe: "lengkapi_kalimat", config: { items: [
    { kalimat_id: "Adik ___ susu setiap pagi", kalimat_en: "My sibling ___ milk every morning", jawaban_id: "minum", jawaban_en: "drinks", pilihan_id: ["minum", "makan", "lari"], pilihan_en: ["drinks", "eats", "runs"] },
    { kalimat_id: "Ikan hidup di dalam ___", kalimat_en: "Fish live in the ___", jawaban_id: "air", jawaban_en: "water", pilihan_id: ["air", "tanah", "udara"], pilihan_en: ["water", "soil", "sky"] },
    { kalimat_id: "Ibu memasak di ___", kalimat_en: "Mother cooks in the ___", jawaban_id: "dapur", jawaban_en: "kitchen", pilihan_id: ["dapur", "kamar", "halaman"], pilihan_en: ["kitchen", "bedroom", "yard"] },
    { kalimat_id: "Pada malam hari kita ___", kalimat_en: "At night we ___", jawaban_id: "tidur", jawaban_en: "sleep", pilihan_id: ["tidur", "berenang", "berlari"], pilihan_en: ["sleep", "swim", "run"] },
  ] } },
  { tipe: "tebak_bunyi", config: { items: ["ba", "bu", "bi", "ma", "mi", "ka", "ku", "sa", "si", "ta"] } },
];

const STARTER_BADGES = [
  { kode: "first_module", nama_id: "Langkah Pertama", nama_en: "First Step", ikon: "👣", d_id: "Selesaikan modul pertamamu", d_en: "Finish your first module" },
  { kode: "star_collector", nama_id: "Kolektor Bintang", nama_en: "Star Collector", ikon: "⭐", d_id: "Dapat 3 bintang di satu modul", d_en: "Get 3 stars in a module" },
  { kode: "streak_3", nama_id: "Api Semangat", nama_en: "On Fire", ikon: "🔥", d_id: "Belajar 3 hari beruntun", d_en: "Learn 3 days in a row" },
  { kode: "streak_7", nama_id: "Seminggu Penuh", nama_en: "Full Week", ikon: "🗓️", d_id: "Belajar 7 hari beruntun", d_en: "Learn 7 days in a row" },
  { kode: "level_5", nama_id: "Bintang Kelas", nama_en: "Class Star", ikon: "🌟", d_id: "Capai level 5", d_en: "Reach level 5" },
  { kode: "level_10", nama_id: "Juara Sejati", nama_en: "True Champion", ikon: "🏆", d_id: "Capai level 10", d_en: "Reach level 10" },
  { kode: "game_master", nama_id: "Jagoan Game", nama_en: "Game Master", ikon: "🎮", d_id: "Mainkan semua game", d_en: "Play all the games" },
  { kode: "modul_10", nama_id: "Penjelajah Ilmu", nama_en: "Knowledge Explorer", ikon: "🧭", d_id: "Selesaikan 10 modul", d_en: "Finish 10 modules" },
  { kode: "skor_100", nama_id: "Nilai Sempurna", nama_en: "Perfect Score", ikon: "💯", d_id: "Dapat nilai 100", d_en: "Score 100" },
  { kode: "tiga_mapel", nama_id: "Serba Bisa", nama_en: "All-Rounder", ikon: "🎒", d_id: "Belajar di 3 mapel berbeda", d_en: "Learn in 3 subjects" },
];

/** Bekali tenant guru baru: tahun ajaran aktif + 11 game + 10 badge. Idempotent. */
export async function provisionGuru(db: Client, guruId: string) {
  const bulan = new Date().getMonth() + 1;
  const tahun = new Date().getFullYear();
  const namaTahun = bulan >= 7 ? `${tahun}/${tahun + 1}` : `${tahun - 1}/${tahun}`;
  await db.query(
    `insert into public.tahun_ajaran (nama, guru_id) values ($1, $2::uuid)
     on conflict (guru_id, nama) do nothing`,
    [namaTahun, guruId]
  );

  const { rows: adaGame } = await db.query(
    "select 1 from public.games where guru_id=$1::uuid limit 1", [guruId]);
  if (!adaGame[0]) {
    for (const g of STARTER_GAMES) {
      await db.query(
        "insert into public.games (module_id, tipe_game, config, guru_id) values (null,$1,$2,$3::uuid)",
        [g.tipe, JSON.stringify(g.config), guruId]
      );
    }
  }

  for (const b of STARTER_BADGES) {
    await db.query(
      `insert into public.badges (kode, nama_id, nama_en, ikon, deskripsi_id, deskripsi_en, guru_id)
       values ($1,$2,$3,$4,$5,$6,$7::uuid)
       on conflict (guru_id, kode) do nothing`,
      [b.kode, b.nama_id, b.nama_en, b.ikon, b.d_id, b.d_en, guruId]
    );
  }
}
