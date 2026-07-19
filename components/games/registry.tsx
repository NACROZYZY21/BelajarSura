"use client";

import type { ComponentType } from "react";
import type { GameType } from "@/lib/types";
import type { DictKey } from "@/lib/i18n";
import { TebakHuruf } from "./tebak-huruf";
import { SusunSukuKata } from "./susun-suku-kata";
import { Cocokkan } from "./cocokkan";
import { HitungBenda } from "./hitung-benda";
import { MemoryGame } from "./memory";
import { BacaUcapkan, speechSupported } from "./baca-ucapkan";
import { TebakKataGambar } from "./tebak-kata-gambar";
import { UrutkanAngka } from "./urutkan-angka";
import { KuisKilat } from "./kuis-kilat";
import { LengkapiKalimat } from "./lengkapi-kalimat";
import { TebakBunyi } from "./tebak-bunyi";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface GameProps {
  config: any;
  onFinish: (correct: number, total: number) => void;
}

/** Skema field editor admin — dipakai GameConfigEditor untuk membentuk form. */
export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "image" | "csv" | "select";
  /** untuk csv: pemisah (default ","); untuk select: pilihan */
  sep?: string;
  options?: string[];
  placeholder?: string;
}

export interface GameDef {
  icon: string;
  nameKey: DictKey;
  descKey: DictKey;
  color: string;
  Component: ComponentType<GameProps>;
  /** false = game disembunyikan dari daftar (mis. browser tak mendukung) */
  isSupported?: () => boolean;
  /** field skalar di root config */
  scalars?: FieldDef[];
  /** daftar item soal: config[listKey] = array objek */
  list?: { key: string; label: string; fields: FieldDef[] };
  defaultConfig: Record<string, unknown>;
}

export const GAME_REGISTRY: Record<GameType, GameDef> = {
  tebak_huruf: {
    icon: "🔤", nameKey: "game_tebak_huruf", descKey: "game_tebak_huruf_desc", color: "#29b0f0",
    Component: TebakHuruf,
    scalars: [{ key: "huruf", label: "Daftar huruf (pisah koma)", type: "csv", placeholder: "a, b, c, d" }],
    defaultConfig: { huruf: ["a", "b", "c", "d", "e"] },
  },
  susun_suku_kata: {
    icon: "🧩", nameKey: "game_susun", descKey: "game_susun_desc", color: "#8b5cf6",
    Component: SusunSukuKata,
    list: {
      key: "kata", label: "Daftar kata",
      fields: [
        { key: "kata", label: "Kata", type: "text", placeholder: "baju" },
        { key: "suku", label: "Suku kata (pisah -)", type: "csv", sep: "-", placeholder: "ba-ju" },
        { key: "emoji", label: "Emoji", type: "text", placeholder: "👕" },
      ],
    },
    defaultConfig: { kata: [{ kata: "baju", suku: ["ba", "ju"], emoji: "👕" }] },
  },
  cocokkan: {
    icon: "🖼️", nameKey: "game_cocokkan", descKey: "game_cocokkan_desc", color: "#ec4899",
    Component: Cocokkan,
    list: {
      key: "pasangan", label: "Pasangan gambar & kata",
      fields: [
        { key: "emoji", label: "Emoji", type: "text", placeholder: "🍎" },
        { key: "kata_id", label: "Kata (ID)", type: "text", placeholder: "apel" },
        { key: "kata_en", label: "Word (EN)", type: "text", placeholder: "apple" },
      ],
    },
    defaultConfig: { pasangan: [{ emoji: "🍎", kata_id: "apel", kata_en: "apple" }] },
  },
  hitung_benda: {
    icon: "🔢", nameKey: "game_hitung", descKey: "game_hitung_desc", color: "#22c55e",
    Component: HitungBenda,
    scalars: [
      { key: "max", label: "Angka maksimum", type: "number" },
      { key: "emoji", label: "Emoji benda (pisah koma)", type: "csv", placeholder: "🍎, ⭐, 🎈" },
    ],
    defaultConfig: { max: 10, emoji: ["🍎", "⭐", "🎈"] },
  },
  memory: {
    icon: "🃏", nameKey: "game_memory", descKey: "game_memory_desc", color: "#f97316",
    Component: MemoryGame,
    list: {
      key: "pasangan", label: "Pasangan kartu",
      fields: [
        { key: "0", label: "Kartu A", type: "text", placeholder: "A" },
        { key: "1", label: "Kartu B", type: "text", placeholder: "a" },
      ],
    },
    defaultConfig: { pasangan: [["A", "a"], ["B", "b"], ["C", "c"], ["D", "d"]] },
  },
  baca_ucapkan: {
    icon: "🎤", nameKey: "game_baca", descKey: "game_baca_desc", color: "#0ea5e9",
    Component: BacaUcapkan,
    isSupported: speechSupported,
    list: {
      key: "items", label: "Daftar kalimat",
      fields: [
        { key: "teks_id", label: "Kalimat (ID)", type: "textarea", placeholder: "Budi suka membaca buku" },
        { key: "teks_en", label: "Sentence (EN)", type: "textarea", placeholder: "Budi likes to read books" },
      ],
    },
    defaultConfig: { items: [{ teks_id: "Aku suka belajar", teks_en: "I love learning" }] },
  },
  tebak_kata_gambar: {
    icon: "🔡", nameKey: "game_spelling", descKey: "game_spelling_desc", color: "#d946ef",
    Component: TebakKataGambar,
    list: {
      key: "items", label: "Daftar gambar & jawaban",
      fields: [
        { key: "gambar_url", label: "Gambar (opsional)", type: "image" },
        { key: "emoji", label: "Emoji (bila tanpa gambar)", type: "text", placeholder: "🍎" },
        { key: "jawaban_id", label: "Jawaban (ID)", type: "text", placeholder: "apel" },
        { key: "jawaban_en", label: "Answer (EN)", type: "text", placeholder: "apple" },
      ],
    },
    defaultConfig: { items: [{ emoji: "🍎", jawaban_id: "apel", jawaban_en: "apple" }] },
  },
  urutkan_angka: {
    icon: "↕️", nameKey: "game_urutkan", descKey: "game_urutkan_desc", color: "#8b5cf6",
    Component: UrutkanAngka,
    scalars: [
      { key: "jumlah", label: "Jumlah angka per ronde", type: "number" },
      { key: "min", label: "Angka terkecil", type: "number" },
      { key: "max", label: "Angka terbesar", type: "number" },
      { key: "arah", label: "Arah urutan", type: "select", options: ["campur", "naik", "turun"] },
      { key: "ronde", label: "Jumlah ronde", type: "number" },
    ],
    defaultConfig: { jumlah: 5, min: 1, max: 20, arah: "campur", ronde: 5 },
  },
  kuis_kilat: {
    icon: "⚡", nameKey: "game_kilat", descKey: "game_kilat_desc", color: "#f59e0b",
    Component: KuisKilat,
    scalars: [{ key: "waktu_per_soal", label: "Waktu per soal (detik)", type: "number" }],
    list: {
      key: "items", label: "Daftar soal",
      fields: [
        { key: "soal_id", label: "Soal (ID)", type: "text", placeholder: "3 + 4 = ?" },
        { key: "soal_en", label: "Question (EN)", type: "text", placeholder: "3 + 4 = ?" },
        { key: "opsi_id", label: "Opsi ID (pisah koma)", type: "csv", placeholder: "6, 7, 8, 9" },
        { key: "opsi_en", label: "Opsi EN (pisah koma)", type: "csv", placeholder: "6, 7, 8, 9" },
        { key: "benar", label: "Indeks benar (0-3)", type: "number" },
      ],
    },
    defaultConfig: {
      waktu_per_soal: 10,
      items: [{ soal_id: "1 + 1 = ?", soal_en: "1 + 1 = ?", opsi_id: ["1", "2", "3", "4"], opsi_en: ["1", "2", "3", "4"], benar: 1 }],
    },
  },
  lengkapi_kalimat: {
    icon: "✍️", nameKey: "game_lengkapi", descKey: "game_lengkapi_desc", color: "#10b981",
    Component: LengkapiKalimat,
    list: {
      key: "items", label: "Daftar kalimat rumpang (pakai ___ untuk bagian kosong)",
      fields: [
        { key: "kalimat_id", label: "Kalimat (ID)", type: "text", placeholder: "Adik ___ susu" },
        { key: "kalimat_en", label: "Sentence (EN)", type: "text", placeholder: "Sister ___ milk" },
        { key: "jawaban_id", label: "Jawaban (ID)", type: "text", placeholder: "minum" },
        { key: "jawaban_en", label: "Answer (EN)", type: "text", placeholder: "drinks" },
        { key: "pilihan_id", label: "Pilihan ID (pisah koma)", type: "csv", placeholder: "minum, makan, lari" },
        { key: "pilihan_en", label: "Pilihan EN (pisah koma)", type: "csv", placeholder: "drinks, eats, runs" },
      ],
    },
    defaultConfig: {
      items: [{ kalimat_id: "Aku suka ___", kalimat_en: "I like ___", jawaban_id: "belajar", jawaban_en: "learning", pilihan_id: ["belajar", "tidur"], pilihan_en: ["learning", "sleeping"] }],
    },
  },
  tebak_bunyi: {
    icon: "📣", nameKey: "game_bunyi", descKey: "game_bunyi_desc", color: "#6366f1",
    Component: TebakBunyi,
    scalars: [{ key: "items", label: "Daftar huruf/suku kata (pisah koma)", type: "csv", placeholder: "ba, bu, ma, mi" }],
    defaultConfig: { items: ["ba", "bu", "ma", "mi", "ka", "ku"] },
  },
};

export const GAME_TYPES = Object.keys(GAME_REGISTRY) as GameType[];
