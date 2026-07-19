"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { AnimatedBg } from "@/components/animated-bg";
import { Mascot } from "@/components/mascot";
import { LangToggle } from "@/components/lang-toggle";

const STUDENT_DOMAIN = "@siswa.belajarceria.id";

function ArsipNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("arsip") === "1")
    return (
      <p className="mb-3 rounded-2xl bg-sunny-100 px-4 py-3 text-center text-sm font-bold text-tangerine-500">
        📦 Akunmu tidak aktif (tahun ajaran berakhir atau akun gurumu nonaktif). Tanya Bapak/Ibu Guru ya!
      </p>
    );
  if (searchParams.get("nonaktif") === "1")
    return (
      <p className="mb-3 rounded-2xl bg-berry-100 px-4 py-3 text-center text-sm font-bold text-berry-500">
        🔒 Akun Anda sedang nonaktif. Silakan hubungi pengelola untuk mengaktifkan kembali langganan.
      </p>
    );
  return null;
}

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<"student" | "admin">("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);
    const supabase = createClient();
    const email =
      tab === "student" && !username.includes("@")
        ? username.trim().toLowerCase() + STUDENT_DOMAIN
        : username.trim();

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err || !data.user) {
      setError(true);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    router.push(
      profile?.role === "superadmin"
        ? "/superadmin"
        : profile?.role === "guru"
          ? "/admin"
          : "/belajar"
    );
    router.refresh();
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4">
      <AnimatedBg />
      <LangToggle className="absolute right-4 top-4" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-4 flex flex-col items-center">
          <Mascot mood="idle" size="text-7xl" />
          <h1 className="font-display text-4xl font-extrabold text-sky-600 drop-shadow-sm">
            {t("app_name")}
          </h1>
          <p className="font-bold text-slate-500">{t("tagline")}</p>
        </div>

        <div className="rounded-3xl bg-white/90 p-6 shadow-xl backdrop-blur">
          <Suspense fallback={null}>
            <ArsipNotice />
          </Suspense>
          <h2 className="mb-4 text-center font-display text-2xl font-bold text-slate-700">
            {t("login_title")}
          </h2>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-sky-50 p-1.5">
            {(
              [
                ["student", "🎒", t("login_student")],
                ["admin", "🧑‍🏫", t("login_admin")],
              ] as const
            ).map(([key, icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`btn-squish rounded-xl px-3 py-2.5 font-display font-bold ${
                  tab === key ? "bg-sky-400 text-white shadow-md" : "text-slate-500"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={tab === "student" ? `${t("username")} (mis. budi)` : "Email"}
              autoCapitalize="none"
              required
              className="rounded-2xl border-2 border-sky-100 bg-sky-50/50 px-4 py-3 text-lg font-bold outline-none focus:border-sky-400"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password")}
              required
              className="rounded-2xl border-2 border-sky-100 bg-sky-50/50 px-4 py-3 text-lg font-bold outline-none focus:border-sky-400"
            />

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="animate-shake rounded-xl bg-berry-100 px-3 py-2 text-center text-sm font-bold text-berry-500"
              >
                {t("login_error")}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-squish mt-1 rounded-2xl bg-gradient-to-r from-sunny-400 to-tangerine-400 py-3.5 font-display text-xl font-extrabold text-white shadow-lg disabled:opacity-60"
            >
              {loading ? "⏳..." : `🚀 ${t("login_btn")}`}
            </button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
