"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useStudent } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Mascot, MascotLoading } from "@/components/mascot";
import { sfx } from "@/lib/sfx";
import type { Subject } from "@/lib/types";

export default function StudentHome() {
  const { profile } = useStudent();
  const { t, pick } = useI18n();
  const [subjects, setSubjects] = useState<Subject[] | null>(null);

  useEffect(() => {
    createClient()
      .from("subjects")
      .select()
      .eq("aktif", true)
      .order("urutan")
      .then(({ data }) => setSubjects((data as Subject[]) ?? []));
  }, []);

  if (!subjects) return <MascotLoading label={t("loading")} />;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Mascot mood="happy" size="text-5xl" />
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-700">
            {t("hello")}, {profile?.nama}! 👋
          </h1>
          <p className="font-bold text-slate-500">{t("pick_subject")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {subjects.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.12, type: "spring", bounce: 0.4 }}
            whileHover={{ y: -8, scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href={`/belajar/mapel/${s.id}`}
              onClick={() => sfx.click()}
              className="block rounded-3xl p-6 shadow-lg transition-shadow hover:shadow-xl"
              style={{ background: `linear-gradient(135deg, ${s.warna}22, ${s.warna}44)` }}
            >
              <motion.span
                className="mb-2 block text-6xl"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4 }}
              >
                {s.ikon}
              </motion.span>
              <h2 className="font-display text-xl font-extrabold" style={{ color: s.warna }}>
                {pick(s.nama_id, s.nama_en)}
              </h2>
              <p className="mt-1 inline-block rounded-full bg-white/80 px-3 py-1 font-display text-sm font-bold text-slate-600">
                {t("start")} →
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
