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
import type { Module, Question, Subject } from "@/lib/types";

export { fetchImagePng };

const ABJAD = ["A", "B", "C", "D", "E"];

/** Bangun lembar soal .docx untuk satu modul; withKey = sertakan kunci jawaban. */
export async function buildSoalDocx(
  mod: Module,
  subject: Subject | undefined,
  questions: Question[],
  withKey: boolean,
  kop: KopSurat | null = null
): Promise<Blob> {
  const pg = questions.filter((q) => q.tipe === "pg");
  const esai = questions.filter((q) => q.tipe === "esai");
  const children: (Paragraph | Table)[] = [...(await buildKopDocx(kop))];

  // ── KOP ──
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "LEMBAR SOAL — BELAJAR CERIA", bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${subject?.nama_id ?? "Mata Pelajaran"} · ${mod.judul_id} · Kelas ${mod.tingkat_kelas}`,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: withKey ? "— VERSI GURU (DENGAN KUNCI JAWABAN) —" : " ",
          bold: true,
          color: "C00000",
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Nama: ______________________    Tanggal: ______________", size: 22 }),
      ],
      spacing: { after: 300 },
    })
  );

  // ── PILIHAN GANDA ──
  if (pg.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "A. Pilihan Ganda", bold: true })],
        spacing: { after: 120 },
      })
    );
    for (const [i, q] of pg.entries()) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 22 }),
            new TextRun({ text: `${q.pertanyaan_id}  `, size: 22 }),
            new TextRun({ text: `(${q.poin} poin)`, italics: true, size: 18, color: "808080" }),
          ],
          spacing: { before: 160 },
        })
      );
      if (q.gambar_url) {
        const img = await fetchImagePng(q.gambar_url);
        if (img)
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: img.data,
                  type: "png",
                  transformation: { width: img.width, height: img.height },
                }),
              ],
              indent: { left: 360 },
            })
          );
      }
      (q.opsi?.id ?? []).forEach((opt, oi) => {
        const isKey = withKey && String(oi) === q.jawaban_benar;
        children.push(
          new Paragraph({
            indent: { left: 480 },
            children: [
              new TextRun({
                text: `${ABJAD[oi]}. ${opt}${isKey ? "   ✔" : ""}`,
                size: 22,
                bold: isKey,
                color: isKey ? "1F7A3D" : undefined,
              }),
            ],
          })
        );
      });
    }
  }

  // ── ESAI / ISIAN ──
  if (esai.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "B. Isian / Esai", bold: true })],
        spacing: { before: 300, after: 120 },
      })
    );
    for (const [i, q] of esai.entries()) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 22 }),
            new TextRun({ text: `${q.pertanyaan_id}  `, size: 22 }),
            new TextRun({ text: `(${q.poin} poin)`, italics: true, size: 18, color: "808080" }),
          ],
          spacing: { before: 160 },
        })
      );
      if (q.gambar_url) {
        const img = await fetchImagePng(q.gambar_url);
        if (img)
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: img.data,
                  type: "png",
                  transformation: { width: img.width, height: img.height },
                }),
              ],
              indent: { left: 360 },
            })
          );
      }
      children.push(
        new Paragraph({
          indent: { left: 480 },
          children: [
            new TextRun({
              text: withKey && q.jawaban_benar
                ? `Kunci: ${q.jawaban_benar}`
                : "Jawaban: ________________________________________________",
              size: 22,
              bold: withKey && !!q.jawaban_benar,
              color: withKey && q.jawaban_benar ? "1F7A3D" : undefined,
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
  }

  // ── RINGKASAN KUNCI (versi guru) ──
  if (withKey && pg.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Kunci Jawaban Pilihan Ganda", bold: true })],
        spacing: { before: 400, after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: pg
              .map((q, i) => `${i + 1}. ${ABJAD[Number(q.jawaban_benar ?? 0)] ?? "-"}`)
              .join("    "),
            size: 22,
          }),
        ],
      })
    );
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

/** Unduh blob sebagai file. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
