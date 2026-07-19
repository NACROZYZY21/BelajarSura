"use client";

import type { Lang } from "./types";

/** Text-to-Speech pakai Web Speech API browser — gratis, tanpa API key. */
export function speak(text: string, lang: Lang = "id") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/<[^>]+>/g, " ").replace(/[#*_`]/g, "");
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = lang === "id" ? "id-ID" : "en-US";
  utter.rate = 0.9; // sedikit pelan untuk anak-anak
  utter.pitch = 1.1;
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang.startsWith(utter.lang));
  if (match) utter.voice = match;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
