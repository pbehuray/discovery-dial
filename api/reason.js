// Vercel serverless function: the AI-native core of the Discovery Dial.
// Given a vibe and a set of "new" tracks, it asks an LLM (Groq/Llama) to judge
// how each new track stays RELEVANT to the vibe while expanding the listener's taste,
// returning a one-line rationale per track.
//
// SAFETY: if GROQ_API_KEY is missing OR the call fails (rate limit, network),
// it falls back to a deterministic template so the demo NEVER breaks.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { vibeLabel, vibeSeed, tracks } = body || {};
  const list = Array.isArray(tracks) ? tracks.slice(0, 8) : [];

  const fallback = () =>
    list.map((t) => ({
      id: t.id,
      why: `Shares the ${vibeSeed?.split(",")[0]?.trim() || "core"} feel of your vibe, but from a lesser-known artist that pushes past the usual rotation.`,
    }));

  const key = process.env.GROQ_API_KEY;
  if (!key || list.length === 0) {
    return res.status(200).json({ source: "fallback", reasons: fallback() });
  }

  const prompt = `You are a music discovery assistant. The listener's chosen vibe is "${vibeLabel}" (${vibeSeed}).
Below are lesser-known tracks being mixed into their listening to expand their taste.
For EACH track, write ONE short sentence (max 20 words) explaining why it fits the vibe yet pushes them somewhere new. Stay concrete and specific; never say "great track" or generic praise.

Tracks:
${list.map((t, i) => `${i + 1}. "${t.title}" by ${t.artist} (mood: ${t.mood}, energy ${t.energy}/5)`).join("\n")}

Respond ONLY with a JSON array of objects like [{"i":1,"why":"..."}]. No prose, no markdown.`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!r.ok) return res.status(200).json({ source: "fallback", reasons: fallback() });

    const data = await r.json();
    let text = data?.choices?.[0]?.message?.content?.trim() || "";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    if (!Array.isArray(parsed)) return res.status(200).json({ source: "fallback", reasons: fallback() });

    const reasons = list.map((t, idx) => {
      const match = parsed.find((p) => Number(p.i) === idx + 1);
      return { id: t.id, why: match?.why || fallback()[idx].why };
    });

    return res.status(200).json({ source: "groq", reasons });
  } catch {
    return res.status(200).json({ source: "fallback", reasons: fallback() });
  }
}
