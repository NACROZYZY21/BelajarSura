import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/openrouter";
import type { ModuleDraft } from "@/lib/types";

const SYSTEM_KREATOR = `Kamu adalah asisten kurikulum untuk "Belajar Ceria", LMS anak SD Indonesia (kelas 1-6), bilingual Indonesia-Inggris.

Tugasmu:
1. Berdiskusi dengan admin/guru tentang kurikulum, ide mapel, dan ide modul.
2. Jika admin meminta dibuatkan modul, hasilkan draft modul dalam blok kode JSON dengan skema PERSIS ini:

\`\`\`json
{
  "judul_id": "...", "judul_en": "...",
  "tingkat_kelas": 1,
  "materi_id": "materi markdown sederhana (# judul, - daftar, **tebal**), ramah anak, pakai emoji",
  "materi_en": "terjemahan Inggris materi",
  "soal_pg": [
    { "pertanyaan_id": "...", "pertanyaan_en": "...", "opsi_id": ["a","b","c","d"], "opsi_en": ["a","b","c","d"], "jawaban_benar": 0 }
  ],
  "soal_esai": [
    { "pertanyaan_id": "...", "pertanyaan_en": "...", "jawaban_contoh": "jawaban singkat bila bisa dinilai otomatis, atau string kosong" }
  ],
  "saran_game": ["salah satu dari 11 tipe game di bawah"],
  "konten_game": [
    { "tipe_game": "...", "config": { } }
  ]
}
\`\`\`

11 tipe game & bentuk config-nya (untuk konten_game — opsional, isi 1-2 game yang paling cocok dengan materi):
- tebak_huruf: {"huruf":["a","b","c"]}
- susun_suku_kata: {"kata":[{"kata":"baju","suku":["ba","ju"],"emoji":"👕"}]}
- cocokkan: {"pasangan":[{"emoji":"🍎","kata_id":"apel","kata_en":"apple"}]}
- hitung_benda: {"max":10,"emoji":["🍎","⭐"]}
- memory: {"pasangan":[["A","a"],["B","b"]]}
- baca_ucapkan: {"items":[{"teks_id":"kalimat","teks_en":"sentence"}]}
- tebak_kata_gambar: {"items":[{"emoji":"🍎","jawaban_id":"apel","jawaban_en":"apple"}]}
- urutkan_angka: {"jumlah":5,"min":1,"max":20,"arah":"campur","ronde":5}
- kuis_kilat: {"waktu_per_soal":10,"items":[{"soal_id":"3+4=?","soal_en":"3+4=?","opsi_id":["6","7","8","9"],"opsi_en":["6","7","8","9"],"benar":1}]}
- lengkapi_kalimat: {"items":[{"kalimat_id":"Adik ___ susu","kalimat_en":"Sister ___ milk","jawaban_id":"minum","jawaban_en":"drinks","pilihan_id":["minum","makan"],"pilihan_en":["drinks","eats"]}]}
- tebak_bunyi: {"items":["ba","bu","ma"]}

Aturan: bahasa sederhana sesuai umur, nada ceria & menyemangati, jangan menghukum. Sertakan penjelasan singkat di luar blok JSON. Jawab dalam Bahasa Indonesia.`;

const SYSTEM_ANALIS = `Kamu adalah analis data pembelajaran untuk "Belajar Ceria", LMS anak SD Indonesia.
Kamu menerima ringkasan data progres siswa dari database (disediakan di bawah). Berdasarkan data itu:
- Beri insight yang jelas dan dapat ditindaklanjuti (misal topik yang banyak salah, siswa yang tertinggal).
- Beri rekomendasi konkret (modul remedial, penyesuaian materi).
- Jawab pertanyaan bebas admin tentang data belajar dengan jujur; jika data tidak cukup, katakan.
Jawab dalam Bahasa Indonesia, ringkas dan terstruktur.`;

/** Ambil data agregat untuk mode analis. */
async function buildAnalystContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [profilesR, modulesR, progressR, questionsR] = await Promise.all([
    supabase.from("profiles").select("id, nama, kelas, xp, streak, last_active").eq("role", "siswa"),
    supabase.from("modules").select("id, judul_id, tingkat_kelas"),
    supabase.from("student_progress").select(),
    supabase.from("questions").select("id, module_id, pertanyaan_id, tipe"),
  ]);
  const students = profilesR.data ?? [];
  const modules = modulesR.data ?? [];
  const progress = progressR.data ?? [];
  const questions = questionsR.data ?? [];

  // rata-rata skor per modul
  const perModule = modules.map((m) => {
    const done = progress.filter((p) => p.module_id === m.id && p.status === "selesai");
    const avg = done.length ? Math.round(done.reduce((s, p) => s + p.skor, 0) / done.length) : null;
    return { modul: m.judul_id, kelas: m.tingkat_kelas, selesai: done.length, rata_skor: avg };
  });

  // soal paling sering salah
  const wrongCount: Record<string, number> = {};
  progress.forEach((p) =>
    (p.jawaban ?? []).forEach((a: { question_id: string; benar: boolean | null }) => {
      if (a.benar === false) wrongCount[a.question_id] = (wrongCount[a.question_id] ?? 0) + 1;
    })
  );
  const soalSalah = Object.entries(wrongCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([qid, n]) => {
      const q = questions.find((x) => x.id === qid);
      const m = modules.find((x) => x.id === q?.module_id);
      return { soal: q?.pertanyaan_id ?? "?", modul: m?.judul_id ?? "?", salah: n };
    });

  // siswa dengan progres rendah
  const perStudent = students.map((s) => {
    const done = progress.filter((p) => p.student_id === s.id && p.status === "selesai");
    const avg = done.length ? Math.round(done.reduce((x, p) => x + p.skor, 0) / done.length) : null;
    return {
      nama: s.nama,
      kelas: s.kelas,
      xp: s.xp,
      modul_selesai: done.length,
      rata_skor: avg,
      terakhir_aktif: s.last_active,
    };
  });

  return JSON.stringify(
    {
      jumlah_siswa: students.length,
      ringkasan_per_modul: perModule,
      soal_paling_sering_salah: soalSalah,
      ringkasan_per_siswa: perStudent,
    },
    null,
    1
  );
}

function extractDraft(text: string): ModuleDraft | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[1]);
    if (obj.judul_id && Array.isArray(obj.soal_pg)) return obj as ModuleDraft;
  } catch {
    // JSON dari model tidak valid — tampilkan sebagai teks biasa saja
  }
  return null;
}

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
  if (profile?.role !== "guru")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { mode, messages, conversationId } = (await req.json()) as {
    mode: "kreator" | "analis";
    messages: { role: "user" | "model"; content: string }[];
    conversationId?: string;
  };
  if (!["kreator", "analis"].includes(mode) || !messages?.length)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  let system = mode === "kreator" ? SYSTEM_KREATOR : SYSTEM_ANALIS;
  if (mode === "analis") {
    const ctx = await buildAnalystContext(supabase);
    system += `\n\n=== DATA TERKINI DARI DATABASE ===\n${ctx}`;
  }

  try {
    const text = await chatCompletion([
      { role: "system", content: system },
      ...messages.map((m) => ({
        role: (m.role === "model" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
    ]);
    const draft = mode === "kreator" ? extractDraft(text) : null;

    // simpan riwayat percakapan
    const allMessages = [...messages, { role: "model", content: text }];
    let convId = conversationId ?? null;
    if (convId) {
      await supabase
        .from("ai_conversations")
        .update({ messages: allMessages, updated_at: new Date().toISOString() })
        .eq("id", convId);
    } else {
      const { data: conv } = await supabase
        .from("ai_conversations")
        .insert({
          admin_id: user.id,
          mode,
          judul: messages[0].content.slice(0, 60),
          messages: allMessages,
        })
        .select("id")
        .single();
      convId = conv?.id ?? null;
    }

    return NextResponse.json({ text, draft, conversationId: convId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
