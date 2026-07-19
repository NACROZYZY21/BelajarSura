/** Rumus level: level n butuh total XP = 50 * n * (n+1) / 2 (makin tinggi makin lama). */
export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

/** Total XP minimum untuk mencapai level tertentu. */
export function xpForLevel(level: number): number {
  return 50 * ((level - 1) * level) / 2;
}

/** Progres 0..1 menuju level berikutnya. */
export function levelProgress(xp: number): { level: number; current: number; needed: number; pct: number } {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const current = xp - base;
  const needed = next - base;
  return { level, current, needed, pct: Math.min(1, current / needed) };
}

/** Bintang 1–3 berdasar persentase skor. */
export function starsFromScore(pct: number): number {
  if (pct >= 90) return 3;
  if (pct >= 70) return 2;
  if (pct >= 40) return 1;
  return 0;
}

/** Evolusi maskot berdasar level. */
export function mascotForLevel(level: number): string {
  if (level >= 20) return "🐲";
  if (level >= 15) return "🦁";
  if (level >= 10) return "🦊";
  if (level >= 5) return "🐱";
  return "🐣";
}

export const AVATARS = ["🦊", "🐱", "🐰", "🐼", "🐨", "🦁", "🐸", "🦄", "🐢", "🐧", "🦉", "🐙"];
