import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET — daftar ujian online utk siswa login (RLS memfilter tenant+peserta+terbit). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: exams }, { data: attempts }, { data: subjects }] = await Promise.all([
    supabase.from("exams").select().order("buka", { ascending: true }),
    supabase.from("exam_attempts").select().eq("student_id", user.id),
    supabase.from("subjects").select("id, nama_id, nama_en, ikon"),
  ]);

  return NextResponse.json({
    exams: (exams ?? []).map((e) => ({
      ...e,
      subject: (subjects ?? []).find((s) => s.id === e.subject_id) ?? null,
      attempt: (attempts ?? []).find((a) => a.exam_id === e.id) ?? null,
    })),
  });
}
