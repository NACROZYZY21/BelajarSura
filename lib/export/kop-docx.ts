"use client";

import {
  AlignmentType,
  BorderStyle,
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { fetchImagePng } from "./img";
import { kopTerisi, type KopSurat } from "@/lib/kop";

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

/** Kop surat standar sekolah Indonesia: logo kiri, teks tengah, garis dobel. */
export async function buildKopDocx(kop: KopSurat | null): Promise<(Paragraph | Table)[]> {
  if (!kopTerisi(kop) || !kop) return [];

  const textLines: Paragraph[] = [];
  if (kop.nama_instansi)
    textLines.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: kop.nama_instansi.toUpperCase(), bold: true, size: 30 })],
      })
    );
  if (kop.alamat)
    textLines.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: kop.alamat, size: 20 })],
      })
    );
  const kontak = [kop.telepon && `Telp. ${kop.telepon}`, kop.email].filter(Boolean).join(" · ");
  if (kontak)
    textLines.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: kontak, size: 20 })],
      })
    );
  if (kop.baris_tambahan)
    textLines.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: kop.baris_tambahan, italics: true, size: 18 })],
      })
    );

  const logoCellChildren: Paragraph[] = [];
  if (kop.logo_url) {
    const img = await fetchImagePng(kop.logo_url);
    if (img) {
      const h = 70;
      const w = Math.round((img.width / img.height) * h);
      logoCellChildren.push(
        new Paragraph({
          children: [
            new ImageRun({ data: img.data, type: "png", transformation: { width: w, height: h } }),
          ],
        })
      );
    }
  }

  const rowCells: TableCell[] = [];
  if (logoCellChildren.length)
    rowCells.push(
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: NO_BORDER,
        verticalAlign: VerticalAlign.CENTER,
        children: logoCellChildren,
      })
    );
  rowCells.push(
    new TableCell({
      width: { size: logoCellChildren.length ? 85 : 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDER,
      verticalAlign: VerticalAlign.CENTER,
      children: textLines.length ? textLines : [new Paragraph("")],
    })
  );
  // penyeimbang kanan agar teks benar-benar di tengah saat ada logo
  if (logoCellChildren.length)
    rowCells.push(
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: NO_BORDER,
        children: [new Paragraph("")],
      })
    );

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { ...NO_BORDER, insideHorizontal: NO_BORDER.top, insideVertical: NO_BORDER.top },
      rows: [new TableRow({ children: rowCells })],
    }),
    // garis pemisah dobel khas kop surat
    new Paragraph({
      border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: "000000" } },
      children: [new TextRun({ text: " ", size: 4 })],
      spacing: { after: 240 },
    }),
  ];
}
