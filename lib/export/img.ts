"use client";

/** Word tidak mendukung webp → konversi via canvas ke PNG + ambil dimensinya. */
export async function fetchImagePng(
  url: string
): Promise<{ data: ArrayBuffer; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const maxW = 340;
    const scale = Math.min(1, maxW / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob: Blob = await new Promise((ok, no) =>
      canvas.toBlob((b) => (b ? ok(b) : no(new Error("konversi gagal"))), "image/png")
    );
    return { data: await blob.arrayBuffer(), width: w, height: h };
  } catch {
    return null;
  }
}
