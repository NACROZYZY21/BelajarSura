"use client";

import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

export interface RecapRow {
  rank: number;
  nama: string;
  kelas: number | null;
  perMapel: Record<string, number | null>; // nama mapel → rata-rata
  nilaiAkhir: number | null;
  modulSelesai: number;
}

function cell(text: string, opts: { bold?: boolean; center?: boolean } = {}) {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold, size: 20 })],
      }),
    ],
  });
}

/** Bangun laporan rekap nilai + ranking .docx dengan kop & tanggal cetak. */
export async function buildRecapDocx(
  rows: RecapRow[],
  mapelNames: string[],
  subtitle: string
): Promise<Blob> {
  const tanggal = new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const header = new TableRow({
    tableHeader: true,
    children: [
      cell("Peringkat", { bold: true, center: true }),
      cell("Nama Siswa", { bold: true }),
      cell("Kelas", { bold: true, center: true }),
      ...mapelNames.map((m) => cell(`Rata ${m}`, { bold: true, center: true })),
      cell("Modul Selesai", { bold: true, center: true }),
      cell("Nilai Akhir", { bold: true, center: true }),
    ],
  });

  const body = rows.map(
    (r) =>
      new TableRow({
        children: [
          cell(String(r.rank), { center: true }),
          cell(r.nama),
          cell(r.kelas != null ? String(r.kelas) : "-", { center: true }),
          ...mapelNames.map((m) =>
            cell(r.perMapel[m] != null ? String(r.perMapel[m]) : "-", { center: true })
          ),
          cell(String(r.modulSelesai), { center: true }),
          cell(r.nilaiAkhir != null ? String(r.nilaiAkhir) : "-", { bold: true, center: true }),
        ],
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "REKAP NILAI & RANKING SISWA", bold: true, size: 32 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Belajar Ceria — Laporan Hasil Belajar", size: 24 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: subtitle, italics: true, size: 20, color: "606060" })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Dicetak: ${tanggal}`, size: 20, color: "606060" })],
            spacing: { after: 300 },
          }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] }),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}
