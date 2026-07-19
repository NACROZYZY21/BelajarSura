"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useStudent } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { MascotLoading } from "@/components/mascot";
import { sfx } from "@/lib/sfx";
import type { Module, StudentProgress, Subject } from "@/lib/types";

/** Peta petualangan: jalur berkelok ala Candy Crush. */
export default function SubjectMapPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = use(params);
  const { profile } = useStudent();
  const { t, pick } = useI18n();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[] | null>(null);
  const [progress, setProgress] = useState<Record<string, StudentProgress>>({});
  const [kelas, setKelas] = useState<number | null>(null);

  const grade = kelas ?? profile?.kelas ?? 1;

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("subjects")
      .select()
      .eq("id", subjectId)
      .single()
      .then(({ data }) => setSubject(data as Subject));
  }, [subjectId]);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("modules")
        .select()
        .eq("subject_id", subjectId)
        .eq("tingkat_kelas", grade)
        .eq("status", "published")
        .order("urutan"),
      supabase.from("student_progress").select().eq("student_id", profile.id),
    ]).then(([mods, prog]) => {
      setModules((mods.data as Module[]) ?? []);
      const map: Record<string, StudentProgress> = {};
      (prog.data as StudentProgress[] | null)?.forEach((p) => (map[p.module_id] = p));
      setProgress(map);
    });
  }, [subjectId, grade, profile]);

  // modul terbuka jika modul sebelumnya selesai
  const unlocked = useMemo(() => {
    const set = new Set<string>();
    let open = true;
    for (const m of modules ?? []) {
      if (open) set.add(m.id);
      open = progress[m.id]?.status === "selesai";
    }
    return set;
  }, [modules, progress]);

  if (!subject || !modules || !profile) return <MascotLoading label={t("loading")} />;

  const lastReachedIdx = (() => {
    let idx = 0;
    modules.forEach((m, i) => {
      if (unlocked.has(m.id)) idx = i;
    });
    return idx;
  })();

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/belajar" className="btn-squish text-2xl" aria-label={t("back")}>
          ⬅️
        </Link>
        <span className="text-4xl">{subject.ikon}</span>
        <div>
          <h1 className="font-display text-xl font-extrabold text-slate-700">
            {pick(subject.nama_id, subject.nama_en)}
          </h1>
          <p className="text-sm font-bold text-slate-500">🗺️ {t("adventure_map")}</p>
        </div>
      </div>

      {/* pilih kelas */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <button
            key={k}
            onClick={() => {
              sfx.click();
              setKelas(k);
            }}
            className={`btn-squish rounded-2xl px-4 py-2 font-display font-extrabold shadow ${
              grade === k ? "bg-sky-400 text-white" : "bg-white text-slate-500"
            }`}
          >
            {t("grade")} {k}
          </button>
        ))}
      </div>

      {modules.length === 0 ? (
        <p className="rounded-3xl bg-white/80 p-8 text-center font-bold text-slate-500">
          🚧 Belum ada modul untuk kelas ini. / No modules for this grade yet.
        </p>
      ) : (
        <div className="relative mx-auto max-w-md pb-8">
          {modules.map((m, i) => {
            const isUnlocked = unlocked.has(m.id);
            const prog = progress[m.id];
            const done = prog?.status === "selesai";
            const align = i % 2 === 0 ? "justify-start" : "justify-end";
            const needsRemedial = done && (prog?.bintang ?? 0) <= 1;

            return (
              <div key={m.id} className={`relative flex ${align}`}>
                {/* jalur penghubung */}
                {i < modules.length - 1 && (
                  <div
                    aria-hidden
                    className={`absolute top-16 h-16 w-24 border-4 border-dashed border-sky-300 ${
                      i % 2 === 0
                        ? "left-16 rounded-br-[3rem] border-l-0 border-t-0"
                        : "right-16 rounded-bl-[3rem] border-r-0 border-t-0"
                    }`}
                  />
                )}

                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, type: "spring", bounce: 0.5 }}
                  className="relative z-10 mb-14 w-56"
                >
                  <Link
                    href={isUnlocked ? `/belajar/modul/${m.id}` : "#"}
                    onClick={(e) => {
                      if (!isUnlocked) e.preventDefault();
                      else sfx.click();
                    }}
                    aria-disabled={!isUnlocked}
                    className={`block ${isUnlocked ? "" : "cursor-not-allowed"}`}
                  >
                    <motion.div
                      whileHover={isUnlocked ? { y: -6, scale: 1.05 } : {}}
                      whileTap={isUnlocked ? { scale: 0.93 } : {}}
                      className={`rounded-3xl p-4 shadow-lg ${
                        done
                          ? "bg-gradient-to-br from-mint-100 to-mint-300/60"
                          : isUnlocked
                            ? "bg-white ring-4 ring-sunny-300"
                            : "bg-slate-100 opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">
                          {done ? "✅" : isUnlocked ? "🎯" : "🔒"}
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-sm font-extrabold leading-tight text-slate-700">
                            {pick(m.judul_id, m.judul_en)}
                          </p>
                          {done && (
                            <p className="mt-1 text-lg leading-none">
                              {"⭐".repeat(prog.bintang)}
                              {"☆".repeat(3 - prog.bintang)}
                            </p>
                          )}
                          {!isUnlocked && (
                            <p className="text-xs font-bold text-slate-400">{t("locked_msg")}</p>
                          )}
                        </div>
                      </div>
                      {needsRemedial && (
                        <p className="mt-2 rounded-xl bg-tangerine-100 px-2 py-1 text-center text-xs font-extrabold text-tangerine-500">
                          💪 {t("practice_again")}
                        </p>
                      )}
                    </motion.div>
                  </Link>

                  {/* karakter berdiri di modul terakhir yang dicapai */}
                  {i === lastReachedIdx && (
                    <motion.span
                      className="absolute -top-8 left-1/2 -translate-x-1/2 text-3xl"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      {profile.avatar}
                    </motion.span>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
