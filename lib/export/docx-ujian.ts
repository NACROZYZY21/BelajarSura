"use client";

import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TextRun,
} from "docx";
import { fetchImagePng } from "./img";
import { buildKopDocx } from "./kop-docx";
import type { KopSurat } from "@/lib/kop";
import type { Exam, Subject } from "@/lib/types";

const ABJAD = ["A", "B", "C", "D", "E"];

/** Soal ujian yang sudah digabung (bank modul / khusus ujian). */
export interface SoalUjian {
  id: string;
  tipe: "pg" | "esai";
  pertanyaan_id: string;
  opsi: { id: string[] } | null;
  jawaban_benar: string | null;
  gambar_url: string | null;
  poin: number;
}

/** Lembar ujian .docx dengan kop guru + identitas siswa. */
export async function buildUjianDocx(
  exam: Exam,
  subject: Subject | undefined,
  soal: SoalUjian[],
  withKey: boolean,
  kop: KopSurat | null
): Promise<Blob> {
  const pg = soal.filter((q) => q.tipe === "pg");
  const esai = soal.filter((q) => q.tipe === "esai");
  const totalPoin = soal.reduce((s, q) => s + q.poin, 0);
  const children: (Paragraph | Table)[] = [...(await buildKopDocx(kop))];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `LEMBAR ${exam.jenis.toUpperCase()} — ${exam.nama.toUpperCase()}`, bold: true, size: 28 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: `${subject?.nama_id ?? ""} · Kelas ${exam.tingkat_kelas} · Total ${totalPoin} poin · Waktu ${exam.durasi_menit} menit`,
        size: 20,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: withKey ? "— VERSI GURU (DENGAN KUNCI JAWABAN) —" : " ",
        bold: true, color: "C00000", size: 20,
      })],
    }),
    new Paragraph({
      children: [new TextRun({
        text: "Nama: ____________________   Kelas: ______   Tanggal: ____________",
        size: 22,
      })],
      spacing: { before: 120, after: 300 },
    })
  );

  const renderSoal = async (q: SoalUjian, nomor: number) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${nomor}. `, bold: true, size: 22 }),
          new TextRun({ text: `${q.pertanyaan_id}  `, size: 22 }),
          new TextRun({ text: `(${q.poin} poin)`, italics: true, size: 18, color: "808080" }),
        ],
        spacing: { before: 160 },
      })
    );
    if (q.gambar_url) {
      const img = await fetchImagePng(q.gambar_url);
      if (img)
        children.push(new Paragraph({
          children: [new ImageRun({ data: img.data, type: "png", transformation: { width: img.width, height: img.height } })],
          indent: { left: 360 },
        }));
    }
    if (q.tipe === "pg") {
      (q.opsi?.id ?? []).forEach((opt, oi) => {
        const isKey = withKey && String(oi) === q.jawaban_benar;
        children.push(new Paragraph({
          indent: { left: 480 },
          children: [new TextRun({
            text: `${ABJAD[oi]}. ${opt}${isKey ? "   ✔" : ""}`,
            size: 22, bold: isKey, color: isKey ? "1F7A3D" : undefined,
          })],
        }));
      });
    } else {
      children.push(new Paragraph({
        indent: { left: 480 },
        children: [new TextRun({
          text: withKey && q.jawaban_benar
            ? `Kunci/contoh: ${q.jawaban_benar}`
            : "Jawaban: ________________________________________________",
          size: 22, bold: withKey && !!q.jawaban_benar,
          color: withKey && q.jawaban_benar ? "1F7A3D" : undefined,
        })],
        spacing: { after: 120 },
      }));
    }
  };

  if (pg.length) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "A. Pilihan Ganda", bold: true })],
      spacing: { after: 120 },
    }));
    for (const [i, q] of pg.entries()) await renderSoal(q, i + 1);
  }
  if (esai.length) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "B. Isian / Esai", bold: true })],
      spacing: { before: 300, after: 120 },
    }));
    for (const [i, q] of esai.entries()) await renderSoal(q, i + 1);
  }
  if (withKey && pg.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Kunci Jawaban Pilihan Ganda", bold: true })],
        spacing: { before: 400, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({
          text: pg.map((q, i) => `${i + 1}. ${ABJAD[Number(q.jawaban_benar ?? 0)] ?? "-"}`).join("    "),
          size: 22,
        })],
      })
    );
  }

  return Packer.toBlob(new Document({ sections: [{ children }] }));
}
