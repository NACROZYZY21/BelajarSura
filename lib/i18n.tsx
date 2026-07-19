"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Lang } from "./types";

const dict = {
  // Umum
  app_name: { id: "Belajar Ceria", en: "Belajar Ceria" },
  tagline: { id: "Belajar jadi menyenangkan!", en: "Learning made fun!" },
  loading: { id: "Memuat...", en: "Loading..." },
  save: { id: "Simpan", en: "Save" },
  cancel: { id: "Batal", en: "Cancel" },
  delete: { id: "Hapus", en: "Delete" },
  edit: { id: "Ubah", en: "Edit" },
  add: { id: "Tambah", en: "Add" },
  back: { id: "Kembali", en: "Back" },
  next: { id: "Lanjut", en: "Next" },
  finish: { id: "Selesai", en: "Finish" },
  search: { id: "Cari...", en: "Search..." },
  logout: { id: "Keluar", en: "Log out" },
  listen: { id: "Dengarkan", en: "Listen" },

  // Login
  login_title: { id: "Ayo Masuk!", en: "Let's Sign In!" },
  login_student: { id: "Aku Siswa", en: "I'm a Student" },
  login_admin: { id: "Guru / Admin", en: "Teacher / Admin" },
  username: { id: "Nama pengguna", en: "Username" },
  password: { id: "Kata sandi", en: "Password" },
  login_btn: { id: "Masuk", en: "Sign In" },
  login_error: { id: "Ups! Nama atau kata sandi salah. Coba lagi ya!", en: "Oops! Wrong name or password. Try again!" },

  // Siswa
  hello: { id: "Halo", en: "Hello" },
  pick_subject: { id: "Mau belajar apa hari ini?", en: "What do you want to learn today?" },
  pick_grade: { id: "Pilih Kelas", en: "Pick a Grade" },
  grade: { id: "Kelas", en: "Grade" },
  adventure_map: { id: "Peta Petualangan", en: "Adventure Map" },
  locked: { id: "Terkunci", en: "Locked" },
  locked_msg: { id: "Selesaikan modul sebelumnya dulu ya!", en: "Finish the previous module first!" },
  start: { id: "Mulai!", en: "Start!" },
  material: { id: "Materi", en: "Lesson" },
  quiz: { id: "Kuis", en: "Quiz" },
  essay: { id: "Isian", en: "Written" },
  result: { id: "Hasil", en: "Result" },
  correct: { id: "Benar! Hebat!", en: "Correct! Awesome!" },
  wrong: { id: "Coba lagi, kamu pasti bisa!", en: "Try again, you can do it!" },
  your_score: { id: "Skormu", en: "Your Score" },
  xp_earned: { id: "XP didapat", en: "XP earned" },
  level_up: { id: "NAIK LEVEL!", en: "LEVEL UP!" },
  level: { id: "Level", en: "Level" },
  streak_day: { id: "hari beruntun", en: "day streak" },
  game_zone: { id: "Zona Game", en: "Game Zone" },
  my_profile: { id: "Profilku", en: "My Profile" },
  badges: { id: "Koleksi Badge", en: "Badge Collection" },
  leaderboard: { id: "Papan Juara", en: "Leaderboard" },
  practice_again: { id: "Ayo latihan lagi!", en: "Let's practice again!" },
  remedial_hint: { id: "Kamu sering keliru di topik ini. Coba ulangi modul ini ya!", en: "You often miss this topic. Try this module again!" },
  play: { id: "Main!", en: "Play!" },
  play_again: { id: "Main Lagi", en: "Play Again" },
  well_done: { id: "Hebat Sekali!", en: "Well Done!" },
  home: { id: "Beranda", en: "Home" },

  // Game
  game_tebak_huruf: { id: "Tebak Huruf", en: "Guess the Letter" },
  game_tebak_huruf_desc: { id: "Dengar suaranya, pilih hurufnya!", en: "Listen and pick the letter!" },
  game_susun: { id: "Susun Suku Kata", en: "Build the Word" },
  game_susun_desc: { id: "Susun suku kata jadi kata!", en: "Arrange syllables into words!" },
  game_cocokkan: { id: "Cocokkan Gambar & Kata", en: "Match Picture & Word" },
  game_cocokkan_desc: { id: "Pasangkan gambar dengan katanya!", en: "Match pictures with words!" },
  game_hitung: { id: "Hitung Benda", en: "Count the Objects" },
  game_hitung_desc: { id: "Hitung bendanya, pilih angkanya!", en: "Count and pick the number!" },
  game_memory: { id: "Memory Card", en: "Memory Card" },
  game_memory_desc: { id: "Temukan kartu pasangannya!", en: "Find the matching pairs!" },
  game_baca: { id: "Baca & Ucapkan", en: "Read & Speak" },
  game_baca_desc: { id: "Baca kalimatnya dengan suara nyaring!", en: "Read the sentence out loud!" },
  game_spelling: { id: "Tebak Kata dari Gambar", en: "Spell the Picture" },
  game_spelling_desc: { id: "Lihat gambarnya, susun ejaannya!", en: "See the picture, spell the word!" },
  game_urutkan: { id: "Urutkan Angka", en: "Order the Numbers" },
  game_urutkan_desc: { id: "Susun angka ke urutan yang benar!", en: "Put numbers in the right order!" },
  game_kilat: { id: "Kuis Kilat", en: "Time Attack Quiz" },
  game_kilat_desc: { id: "Jawab cepat sebelum waktu habis!", en: "Answer fast before time runs out!" },
  game_lengkapi: { id: "Lengkapi Kalimat", en: "Complete the Sentence" },
  game_lengkapi_desc: { id: "Isi kata yang hilang!", en: "Fill in the missing word!" },
  game_bunyi: { id: "Tebak Bunyi Huruf", en: "Guess the Sound" },
  game_bunyi_desc: { id: "Dengar bunyinya, pilih yang benar!", en: "Hear the sound, pick the right one!" },
  mic_needed: { id: "Game ini butuh mikrofon dan browser yang mendukung. Coba pakai Chrome ya! 🎤", en: "This game needs a microphone and a supported browser. Try Chrome! 🎤" },
  try_again: { id: "Coba Lagi", en: "Try Again" },
  listen_first: { id: "Tekan mikrofon lalu baca kalimatnya!", en: "Press the mic then read the sentence!" },

  // Penilaian & review esai
  essay_pending: { id: "Jawabanmu sedang diperiksa guru ⏳", en: "Your answer is being checked by the teacher ⏳" },
  teacher_comment: { id: "Komentar guru", en: "Teacher's comment" },
  review_queue: { id: "Review Esai", en: "Essay Review" },
  waiting_review: { id: "Menunggu review", en: "Waiting for review" },
  graded: { id: "Sudah dinilai", en: "Graded" },
  redo: { id: "Kerjakan Lagi", en: "Do it Again" },
  points: { id: "poin", en: "points" },
  acc_save: { id: "✅ ACC & Simpan Nilai", en: "✅ Approve & Save Score" },
  split_evenly: { id: "Bagi rata otomatis", en: "Auto-distribute evenly" },
  total_points: { id: "Total bobot soal", en: "Total question weight" },
  answer_key_ref: { id: "Contoh jawaban", en: "Sample answer" },

  // Admin
  dashboard: { id: "Dasbor", en: "Dashboard" },
  subjects: { id: "Mata Pelajaran", en: "Subjects" },
  modules: { id: "Modul", en: "Modules" },
  students: { id: "Siswa", en: "Students" },
  ai_agent: { id: "Asisten AI", en: "AI Assistant" },
  reports: { id: "Laporan", en: "Reports" },
  total_students: { id: "Total Siswa", en: "Total Students" },
  total_modules: { id: "Total Modul", en: "Total Modules" },
  completions: { id: "Modul Diselesaikan", en: "Modules Completed" },
  avg_score: { id: "Rata-rata Skor", en: "Average Score" },
  recent_activity: { id: "Aktivitas Terbaru", en: "Recent Activity" },
  published: { id: "Terbit", en: "Published" },
  draft: { id: "Draf", en: "Draft" },
  mode_kreator: { id: "Mode Kreator Modul", en: "Module Creator Mode" },
  mode_analis: { id: "Mode Analis Data", en: "Data Analyst Mode" },
  reset_password: { id: "Reset Kata Sandi", en: "Reset Password" },
  export: { id: "Ekspor CSV", en: "Export CSV" },
} as const;

export type DictKey = keyof typeof dict;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
  /** pilih teks bilingual dari record DB */
  pick: (id_text: string | null | undefined, en_text: string | null | undefined) => string;
}

const Ctx = createContext<I18nCtx>({
  lang: "id",
  setLang: () => {},
  t: (k) => dict[k].id,
  pick: (a) => a ?? "",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const saved = localStorage.getItem("bc_lang") as Lang | null;
    if (saved === "id" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("bc_lang", l);
  };

  const t = (key: DictKey) => dict[key][lang];
  const pick = (id_text: string | null | undefined, en_text: string | null | undefined) =>
    (lang === "id" ? id_text : en_text) || id_text || en_text || "";

  return <Ctx.Provider value={{ lang, setLang, t, pick }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
