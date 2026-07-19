export type Role = "admin" | "student";
export type Lang = "id" | "en";
export type GameType =
  | "tebak_huruf"
  | "susun_suku_kata"
  | "cocokkan"
  | "hitung_benda"
  | "memory"
  | "baca_ucapkan"
  | "tebak_kata_gambar"
  | "urutkan_angka"
  | "kuis_kilat"
  | "lengkapi_kalimat"
  | "tebak_bunyi";

export interface Profile {
  id: string;
  role: Role;
  nama: string;
  kelas: number | null;
  avatar: string;
  xp: number;
  streak: number;
  last_active: string | null;
  bahasa: Lang;
  created_at: string;
  tahun_ajaran_id: string | null;
  aktif: boolean;
}

export interface TahunAjaran {
  id: string;
  nama: string;
  status: "aktif" | "diarsipkan";
  created_at: string;
  diarsipkan_pada: string | null;
}

export interface Subject {
  id: string;
  nama_id: string;
  nama_en: string;
  ikon: string;
  warna: string;
  urutan: number;
  aktif: boolean;
}

export interface Module {
  id: string;
  subject_id: string;
  tingkat_kelas: number;
  judul_id: string;
  judul_en: string;
  materi_id: string;
  materi_en: string;
  urutan: number;
  status: "draft" | "published";
  dibuat_oleh_ai: boolean;
}

export interface Question {
  id: string;
  module_id: string;
  tipe: "pg" | "esai";
  pertanyaan_id: string;
  pertanyaan_en: string;
  opsi: { id: string[]; en: string[] } | null;
  jawaban_benar: string | null;
  poin: number;
  urutan: number;
  gambar_url: string | null;
}

export interface Game {
  id: string;
  module_id: string | null;
  tipe_game: GameType;
  config: Record<string, unknown>;
}

export interface StudentProgress {
  id: string;
  student_id: string;
  module_id: string;
  status: "berjalan" | "selesai";
  skor: number;
  bintang: number;
  poin_pg: number;
  jawaban: { question_id: string; jawaban: string; benar: boolean | null }[];
  selesai_pada: string | null;
  updated_at: string;
  tahun_ajaran_id: string | null;
}

export interface EssaySubmission {
  id: string;
  student_id: string;
  module_id: string;
  question_id: string;
  jawaban: string;
  status_review: "otomatis" | "menunggu_review" | "sudah_dinilai";
  poin_diberikan: number | null;
  komentar_admin: string | null;
  direview_pada: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  kode: string;
  nama_id: string;
  nama_en: string;
  ikon: string;
  deskripsi_id: string;
  deskripsi_en: string;
  xp_syarat: number;
}

export interface AiMessage {
  role: "user" | "model";
  content: string;
  draft?: ModuleDraft | null;
}

/** Draft modul terstruktur yang dihasilkan AI mode kreator */
export interface ModuleDraft {
  judul_id: string;
  judul_en: string;
  tingkat_kelas: number;
  materi_id: string;
  materi_en: string;
  soal_pg: {
    pertanyaan_id: string;
    pertanyaan_en: string;
    opsi_id: string[];
    opsi_en: string[];
    jawaban_benar: number;
  }[];
  soal_esai: { pertanyaan_id: string; pertanyaan_en: string; jawaban_contoh?: string }[];
  saran_game: string[];
  /** Konten game siap pakai yang dihasilkan AI (opsional) — admin selalu bisa edit manual. */
  konten_game?: { tipe_game: GameType; config: Record<string, unknown> }[];
}
