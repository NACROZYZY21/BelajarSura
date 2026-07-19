"use client";

import { useState } from "react";
import { speak, stopSpeaking } from "@/lib/tts";
import { useI18n } from "@/lib/i18n";

/** Tombol 🔊 — bacakan teks dengan Web Speech API. */
export function TtsButton({ text, className = "" }: { text: string; className?: string }) {
  const { lang, t } = useI18n();
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
    } else {
      speak(text, lang);
      setPlaying(true);
      // perkiraan selesai — Web Speech tidak selalu menembakkan onend lintas browser
      const est = Math.min(30000, 1500 + text.length * 70);
      setTimeout(() => setPlaying(false), est);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("listen")}
      title={t("listen")}
      className={`btn-squish inline-flex h-11 w-11 items-center justify-center rounded-full bg-sunny-400 text-xl shadow-md hover:bg-sunny-500 ${playing ? "animate-wiggle" : ""} ${className}`}
    >
      {playing ? "⏸️" : "🔊"}
    </button>
  );
}
