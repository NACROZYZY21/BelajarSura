"use client";

import { useI18n } from "@/lib/i18n";

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`flex items-center rounded-full bg-white/80 p-1 shadow ${className}`}>
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`btn-squish rounded-full px-3 py-1 text-sm font-bold ${
            lang === l ? "bg-sky-400 text-white shadow" : "text-slate-500"
          }`}
        >
          {l === "id" ? "🇮🇩 ID" : "🇬🇧 EN"}
        </button>
      ))}
    </div>
  );
}
