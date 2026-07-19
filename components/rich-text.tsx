"use client";

import { Fragment } from "react";

/** Renderer markdown mini untuk materi modul (heading, list, bold, italic, gambar). */
function inline(text: string, key: number) {
  const parts = text.split(/(!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <Fragment key={key}>
      {parts.map((p, i) => {
        const img = p.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (img)
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img[2]}
              alt={img[1] || "gambar materi"}
              className="my-3 max-h-80 w-auto max-w-full rounded-2xl shadow-md"
              loading="lazy"
            />
          );
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} className="text-sky-600">{p.slice(2, -2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
        return p;
      })}
    </Fragment>
  );
}

export function RichText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = (key: string) => {
    if (!list.length) return;
    out.push(
      <ul key={key} className="my-2 space-y-1.5 pl-1">
        {list.map((li, i) => (
          <li key={i} className="flex gap-2 text-lg font-semibold">
            <span>🔹</span>
            <span>{inline(li, i)}</span>
          </li>
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      list.push(trimmed.slice(2));
      return;
    }
    flushList(`ul${i}`);
    if (!trimmed) return;
    if (trimmed.startsWith("# "))
      out.push(
        <h2 key={i} className="mb-2 mt-1 font-display text-2xl font-extrabold text-slate-700">
          {inline(trimmed.slice(2), i)}
        </h2>
      );
    else if (trimmed.startsWith("## "))
      out.push(
        <h3 key={i} className="mb-1 mt-2 font-display text-xl font-bold text-slate-700">
          {inline(trimmed.slice(3), i)}
        </h3>
      );
    else
      out.push(
        <p key={i} className="my-2 text-lg font-semibold leading-relaxed">
          {inline(trimmed, i)}
        </p>
      );
  });
  flushList("ul-end");

  return <div>{out}</div>;
}
