"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { GAME_REGISTRY, type FieldDef } from "@/components/games/registry";
import { ImagePickButton } from "./image-upload";
import type { GameType } from "@/lib/types";

/** Editor konten game terstruktur — form dibentuk dari skema di registry,
 *  sehingga menambah tipe game baru cukup mendaftarkan skemanya. */
export function GameConfigEditor({
  tipe,
  config,
  onChange,
}: {
  tipe: GameType;
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}) {
  const def = GAME_REGISTRY[tipe];
  if (!def) return null;

  const input =
    "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-sky-400";

  const readField = (obj: any, f: FieldDef): string => {
    const v = obj?.[f.key];
    if (f.type === "csv") return Array.isArray(v) ? v.join((f.sep ?? ",") === "," ? ", " : f.sep!) : "";
    return v === undefined || v === null ? "" : String(v);
  };

  const writeField = (obj: any, f: FieldDef, raw: string): any => {
    let v: any = raw;
    if (f.type === "csv")
      v = raw.split(f.sep ?? ",").map((s) => s.trim()).filter(Boolean);
    else if (f.type === "number") v = raw === "" ? 0 : Number(raw);
    // item bertipe array (mis. pasangan memory ["A","a"]) harus tetap array
    if (Array.isArray(obj)) {
      const copy = [...obj];
      copy[Number(f.key)] = v;
      return copy;
    }
    return { ...obj, [f.key]: v };
  };

  const renderField = (f: FieldDef, obj: any, setObj: (o: any) => void) => {
    if (f.type === "image") {
      const url = obj?.[f.key];
      return url ? (
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-10 rounded shadow" />
          <button
            type="button"
            onClick={() => setObj({ ...obj, [f.key]: "" })}
            className="text-xs font-semibold text-red-500"
          >
            🗑️
          </button>
        </span>
      ) : (
        <ImagePickButton
          folder="game"
          label={`📷 ${f.label}`}
          onUploaded={(u) => setObj({ ...obj, [f.key]: u })}
        />
      );
    }
    if (f.type === "select")
      return (
        <select
          className={input}
          value={readField(obj, f)}
          onChange={(e) => setObj(writeField(obj, f, e.target.value))}
          title={f.label}
        >
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    if (f.type === "textarea")
      return (
        <textarea
          className={`${input} min-h-14`}
          placeholder={f.placeholder ?? f.label}
          title={f.label}
          value={readField(obj, f)}
          onChange={(e) => setObj(writeField(obj, f, e.target.value))}
        />
      );
    return (
      <input
        type={f.type === "number" ? "number" : "text"}
        className={input}
        placeholder={f.placeholder ?? f.label}
        title={f.label}
        value={readField(obj, f)}
        onChange={(e) => setObj(writeField(obj, f, e.target.value))}
      />
    );
  };

  const items: any[] = def.list ? (Array.isArray(config[def.list.key]) ? config[def.list.key] : []) : [];
  const setItems = (arr: any[]) => onChange({ ...config, [def.list!.key]: arr });

  // item baru mengikuti contoh pertama dari defaultConfig
  const blankItem = () => {
    const sample = (def.defaultConfig as any)[def.list!.key]?.[0];
    if (Array.isArray(sample)) return sample.map(() => "");
    const o: any = {};
    def.list!.fields.forEach((f) => (o[f.key] = f.type === "csv" ? [] : ""));
    return o;
  };

  return (
    <div className="space-y-3">
      {def.scalars && (
        <div className="grid gap-2 sm:grid-cols-2">
          {def.scalars.map((f) => (
            <label key={f.key} className="text-xs font-semibold text-slate-500">
              {f.label}
              {renderField(f, config, onChange)}
            </label>
          ))}
        </div>
      )}

      {def.list && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{def.list.label}</span>
            <button
              type="button"
              onClick={() => setItems([...items, blankItem()])}
              className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-600"
            >
              + Tambah item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl bg-white p-2.5 shadow-sm">
                <span className="mt-1.5 text-xs font-bold text-slate-400">{i + 1}.</span>
                <div className="grid flex-1 gap-1.5 sm:grid-cols-2">
                  {def.list!.fields.map((f) => (
                    <span key={f.key}>
                      {renderField(f, item, (o) => setItems(items.map((x, j) => (j === i ? o : x))))}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  className="mt-1 text-red-400 hover:text-red-600"
                  title="Hapus item"
                >
                  🗑️
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="rounded-xl bg-slate-100 p-3 text-center text-xs text-slate-400">
                Belum ada item — klik &quot;+ Tambah item&quot;.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
