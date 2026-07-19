"use client";

import { createClient } from "@/lib/supabase/client";

const MAX_WIDTH = 1200;
const BUCKET = "media-belajar";

/** Resize gambar di client (maks lebar 1200px) → WebP, hemat storage & cepat dimuat. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal mengompres gambar"))),
      "image/webp",
      0.85
    );
  });
}

/**
 * Kompres lalu upload gambar ke bucket media-belajar.
 * Balikan: URL publik gambar. Lempar Error bila bukan gambar / gagal.
 */
export async function uploadImage(file: File, folder = "umum"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar");
  if (file.size > 10 * 1024 * 1024) throw new Error("Gambar terlalu besar (maks 10 MB)");

  const blob = await compressImage(file);
  const path = `${folder}/${crypto.randomUUID()}.webp`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/webp", upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
