"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Modal ganti password superadmin — API sama dengan siswa/guru (verifikasi lama dulu). */
function PasswordModal({ onClose }: { onClose: () => void }) {
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulang, setUlang] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setMsg(null);
    if (baru.length < 8)
      return setMsg({ ok: false, text: "Password superadmin minimal 8 karakter" });
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
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Gagal" });
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-xl font-bold text-slate-800">🔑 Ganti Password Superadmin</h2>
        <div className="space-y-3">
          <input type="password" className={input} placeholder="Password lama" value={lama} onChange={(e) => setLama(e.target.value)} />
          <input type="password" className={input} placeholder="Password baru (min. 8 karakter)" value={baru} onChange={(e) => setBaru(e.target.value)} />
          <input type="password" className={input} placeholder="Ulangi password baru" value={ulang} onChange={(e) => setUlang(e.target.value)} />
          {msg && (
            <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
              {msg.text}
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100">Tutup</button>
          <button onClick={submit} disabled={busy || !lama || !baru || !ulang}
            className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50">
            {busy ? "⏳..." : "💾 Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);

  const nav = [
    { href: "/superadmin", icon: "📊", label: "Dashboard" },
    { href: "/superadmin/guru", icon: "👩‍🏫", label: "Manajemen Guru" },
    { href: "/superadmin/langganan", icon: "💳", label: "Status Langganan" },
  ];

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      {showPwd && <PasswordModal onClose={() => setShowPwd(false)} />}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-slate-900 lg:block">
        <nav className="flex h-full flex-col gap-1 p-4">
          <div className="mb-6 flex items-center gap-2 px-2">
            <span className="text-3xl">🛡️</span>
            <div>
              <p className="font-display text-lg font-extrabold text-white">Belajar Ceria</p>
              <p className="text-xs font-bold text-indigo-300">SUPERADMIN</p>
            </div>
          </div>
          {nav.map((n) => {
            const active =
              n.href === "/superadmin" ? pathname === "/superadmin" : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                  active ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800"
                }`}>
                <span>{n.icon}</span>{n.label}
              </Link>
            );
          })}
          <div className="mt-auto space-y-1">
            <button onClick={() => setShowPwd(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-slate-300 hover:bg-slate-800">
              🔑 Ganti Password
            </button>
            <button onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-slate-300 hover:bg-red-900/40 hover:text-red-300">
              🚪 Keluar
            </button>
          </div>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 lg:hidden">
          <span className="font-display font-extrabold text-white">🛡️ Superadmin</span>
          <div className="ml-auto flex gap-2">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-xl" title={n.label}>{n.icon}</Link>
            ))}
            <button onClick={logout} className="text-xl" title="Keluar">🚪</button>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
