import "server-only";

/**
 * Panggil OpenRouter (kompatibel OpenAI chat completions) dengan fallback:
 * model gratis sering gagal sesaat, jadi tiap kandidat dicoba 2x.
 * Balikan: teks jawaban. Lempar Error bila semua gagal.
 */
export async function chatCompletion(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string> {
  const base = [process.env.OPENROUTER_MODEL ?? "openrouter/free", "openrouter/free"]
    .filter((m, i, arr) => arr.indexOf(m) === i);
  const candidates = base.flatMap((m) => [m, m]);

  let lastError = "";
  for (const model of candidates) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Belajar Ceria",
      },
      body: JSON.stringify({ model, messages }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && !data?.error) {
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim()) return content;
      lastError = `Model ${model} mengembalikan jawaban kosong`;
    } else {
      lastError = data?.error?.message ?? `OpenRouter error ${res.status}`;
    }
  }
  throw new Error(lastError || "Semua model gagal menjawab");
}
