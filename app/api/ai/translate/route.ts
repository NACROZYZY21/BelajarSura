import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/openrouter";

const SYSTEM = `Kamu penerjemah profesional Indonesia → Inggris untuk materi belajar anak SD.
Kamu menerima ARRAY JSON berisi string berbahasa Indonesia. Terjemahkan SETIAP elemen ke Bahasa Inggris yang sederhana dan ramah anak.

ATURAN WAJIB:
- Balas HANYA array JSON string valid, jumlah & urutan elemen PERSIS sama dengan input. Tanpa penjelasan, tanpa blok kode.
- Pertahankan format markdown apa adanya: # judul, - daftar, **tebal**, *miring*.
- Placeholder gambar seperti ![gambar](https://...) JANGAN diubah sama sekali (alt boleh diterjemahkan, URL tidak).
- Pertahankan emoji, angka, dan simbol matematika.
- Elemen kosong ("") tetap dibalas "".`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { texts } = (await req.json()) as { texts: string[] };
  if (!Array.isArray(texts) || texts.length === 0 || texts.length > 80)
    return NextResponse.json({ error: "texts harus array 1-80 string" }, { status: 400 });
  if (texts.some((t) => typeof t !== "string" || t.length > 8000))
    return NextResponse.json({ error: "Tiap teks maks 8000 karakter" }, { status: 400 });

  try {
    const raw = await chatCompletion([
      { role: "system", content: SYSTEM },
      { role: "user", content: JSON.stringify(texts) },
    ]);

    // ambil array JSON dari jawaban model (kadang dibungkus teks/blok kode)
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end <= start) throw new Error("Model tidak membalas array JSON");
    const translations = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(translations) || translations.length !== texts.length)
      throw new Error("Jumlah hasil terjemahan tidak sesuai — coba lagi");

    return NextResponse.json({ translations: translations.map((t) => String(t)) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Translate error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
