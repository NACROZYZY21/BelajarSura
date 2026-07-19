"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { StudentProvider, useStudent } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { AnimatedBg } from "@/components/animated-bg";
import { XpBar } from "@/components/xp-bar";
import { LangToggle } from "@/components/lang-toggle";
import { MascotLoading } from "@/components/mascot";
import { burstConfetti } from "@/lib/confetti";
import { sfx } from "@/lib/sfx";
import { useEffect } from "react";

function BadgeToast() {
  const { newBadge, clearNewBadge } = useStudent();
  const { pick } = useI18n();

  useEffect(() => {
    if (newBadge) {
      sfx.levelUp();
      burstConfetti();
      const t = setTimeout(clearNewBadge, 4000);
      return () => clearTimeout(t);
    }
  }, [newBadge, clearNewBadge]);

  return (
    <AnimatePresence>
      {newBadge && (
        <motion.div
          initial={{ y: -120, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2"
          onClick={clearNewBadge}
        >
          <div className="flex items-center gap-3 rounded-3xl bg-white px-5 py-3 shadow-2xl ring-4 ring-sunny-300">
            <motion.span
              className="text-4xl"
              animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 0.8, repeat: 2 }}
            >
              {newBadge.ikon}
            </motion.span>
            <div>
              <p className="font-display text-sm font-bold text-tangerine-500">🎁 Badge baru!</p>
              <p className="font-display text-lg font-extrabold text-slate-700">
                {pick(newBadge.nama_id, newBadge.nama_en)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { profile } = useStudent();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  if (!profile) {
    return (
      <main className="min-h-screen">
        <AnimatedBg />
        <MascotLoading label={t("loading")} />
      </main>
    );
  }

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const nav = [
    { href: "/belajar", icon: "🏠", label: t("home") },
    { href: "/belajar/game", icon: "🎮", label: t("game_zone") },
    { href: "/belajar/ujian", icon: "🎓", label: "Ujian" },
    { href: "/belajar/profil", icon: "⭐", label: t("my_profile") },
  ];

  return (
    <div className="min-h-screen pb-24">
      <AnimatedBg />
      <BadgeToast />

      <header className="sticky top-0 z-40 bg-white/70 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <Link href="/belajar/profil" className="btn-squish text-3xl" aria-label={t("my_profile")}>
            {profile.avatar}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-slate-700">
              {profile.nama}
            </p>
            <XpBar xp={profile.xp} compact />
          </div>
          <div
            className="flex items-center gap-1 rounded-full bg-tangerine-100 px-2.5 py-1"
            title={`${profile.streak} ${t("streak_day")}`}
          >
            <span className={profile.streak > 0 ? "animate-flame inline-block" : "grayscale"}>
              🔥
            </span>
            <span className="font-display font-extrabold text-tangerine-500">
              {profile.streak}
            </span>
          </div>
          <LangToggle />
          <button
            onClick={logout}
            aria-label={t("logout")}
            title={t("logout")}
            className="btn-squish text-xl"
          >
            🚪
          </button>
        </div>
      </header>

      <motion.main
        key={pathname}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mx-auto max-w-3xl px-4 py-5"
      >
        {children}
      </motion.main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around py-1.5">
          {nav.map((n) => {
            const active =
              n.href === "/belajar" ? pathname === "/belajar" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => sfx.click()}
                className={`btn-squish flex flex-col items-center rounded-2xl px-5 py-1.5 ${
                  active ? "bg-sky-100" : ""
                }`}
              >
                <span className="text-2xl">{n.icon}</span>
                <span
                  className={`font-display text-xs font-bold ${
                    active ? "text-sky-600" : "text-slate-400"
                  }`}
                >
                  {n.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function BelajarLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentProvider>
      <Shell>{children}</Shell>
    </StudentProvider>
  );
}
