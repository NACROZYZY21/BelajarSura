"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/lib/upload";

/** Tombol pilih file gambar → kompres → upload → callback URL publik. */
export function ImagePickButton({
  folder,
  onUploaded,
  label = "📷 Sisipkan Gambar",
  className = "",
}: {
  folder: string;
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      onUploaded(await uploadImage(file, folder));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal upload");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-lg bg-sky-100 px-3 py-1.5 text-sm font-semibold text-sky-600 hover:bg-sky-200 disabled:opacity-50"
      >
        {busy ? "⏳ Mengunggah..." : label}
      </button>
      {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
    </span>
  );
}

/** Kontrol gambar per soal: thumbnail + ganti + hapus. */
export function QuestionImageControl({
  url,
  folder,
  onChange,
}: {
  url: string | null;
  folder: string;
  onChange: (url: string | null) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-3">
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="gambar soal" className="h-16 w-auto rounded-lg shadow" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100"
          >
            🗑️ Hapus gambar
          </button>
        </>
      ) : (
        <ImagePickButton folder={folder} onUploaded={onChange} label="📷 Gambar soal (opsional)" />
      )}
    </div>
  );
}
