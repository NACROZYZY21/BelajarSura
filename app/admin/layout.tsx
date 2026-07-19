"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/lang-toggle";
import { useEffect, useState } from "react";

/** Modal ganti password admin — memakai API yang sama dengan siswa. */
function AdminPasswordModal({ onClose }: { onClose: () => void }) {
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulang, setUlang] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setMsg(null);
    if (baru.length < 6) return setMsg({ ok: false, text: "Password baru minimal 6 karakter" });
    if (baru !== ulang) return setMsg({ ok: false, text: "Konfirmasi password tidak sama" });
    setBusy(true);
    try {
      const res = await fetch("/api/student/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: lama, newPassword: baru }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg({ ok: true, text: "✅ Password berhasil diganti." });
      setLama(""); setBaru(""); setUlang("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Gagal mengganti password" });
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-xl font-bold text-slate-800">🔑 Ganti Password Admin</h2>
        <div className="space-y-3">
          <input type="password" className={input} placeholder="Password lama"
            value={lama} onChange={(e) => setLama(e.target.value)} />
          <input type="password" className={input} placeholder="Password baru (min. 6 karakter)"
            value={baru} onChange={(e) => setBaru(e.target.value)} />
          <input type="password" className={input} placeholder="Ulangi password baru"
            value={ulang} onChange={(e) => setUlang(e.target.value)} />
          {msg && (
            <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              msg.ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            }`}>{msg.text}</p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">
            Tutup
          </button>
          <button onClick={submit} disabled={busy || !lama || !baru || !ulang}
            className="rounded-xl bg-sky-500 px-5 py-2 font-semibold text-white shadow hover:bg-sky-600 disabled:opacity-50">
            {busy ? "⏳..." : "💾 Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingReview, setPendingReview] = useState(0);
  const [showPwd, setShowPwd] = useState(false);

  // badge jumlah esai menunggu review — segarkan tiap pindah halaman
  useEffect(() => {
    createClient()
      .from("essay_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status_review", "menunggu_review")
      .then(({ count }) => setPendingReview(count ?? 0));
  }, [pathname]);

  const nav = [
    { href: "/admin", icon: "📊", label: t("dashboard") },
    { href: "/admin/subjects", icon: "📚", label: t("subjects") },
    { href: "/admin/modules", icon: "📝", label: t("modules") },
    { href: "/admin/ujian", icon: "🎓", label: "Ujian" },
    { href: "/admin/review", icon: "✏️", label: t("review_queue"), badge: pendingReview },
    { href: "/admin/students", icon: "🎒", label: t("students") },
    { href: "/admin/ai", icon: "🤖", label: t("ai_agent") },
    { href: "/admin/recap", icon: "🧮", label: "Recap Nilai" },
    { href: "/admin/reports", icon: "📈", label: t("reports") },
    { href: "/admin/arsip", icon: "📦", label: "Arsip" },
    { href: "/admin/kop", icon: "📜", label: "Kop Surat" },
  ];

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="text-3xl">🐥</span>
        <div>
          <p className="font-display text-lg font-extrabold text-sky-600">Belajar Ceria</p>
          <p className="text-xs font-bold text-slate-400">Admin Panel</p>
        </div>
      </div>
      {nav.map((n) => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-colors ${
              active
                ? "bg-sky-500 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{n.icon}</span>
            <span className="flex-1">{n.label}</span>
            {"badge" in n && (n.badge ?? 0) > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {n.badge}
              </span>
            )}
          </Link>
        );
      })}
      <div className="mt-auto space-y-1">
        <LangToggle className="mb-2" />
        <button
          onClick={() => setShowPwd(true)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-slate-600 hover:bg-slate-100"
        >
          🔑 Ganti Password
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-slate-600 hover:bg-red-50 hover:text-red-500"
        >
          🚪 {t("logout")}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {showPwd && <AdminPasswordModal onClose={() => setShowPwd(false)} />}
      {/* sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="text-2xl" aria-label="Menu">
            ☰
          </button>
          <span className="font-display font-extrabold text-sky-600">🐥 Admin</span>
        </header>
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-4 lg:p-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
