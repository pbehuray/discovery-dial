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
      why: `Shares the ${vibeSeed?.split(",")[0]?.trim() || "core"} feel of the vibe, but from a lesser-known artist that pushes past the usual rotation.`,
    }));

  const key = process.env.GROQ_API_KEY;
  if (!key || list.length === 0) {
    return res.status(200).json({ source: "fallback", reasons: fallback() });
  }

  const prompt = `You are a music critic writing one-line liner notes for a discovery playlist. The chosen vibe is "${vibeLabel}" — ${vibeSeed}.

Below are lesser-known tracks slotted into this vibe to stretch the listener's taste. For EACH track, write ONE short sentence (max 18 words) explaining why it belongs in this vibe but opens something new.

STRICT RULES:
- Each sentence MUST be distinct. Never repeat phrasing, opening words, or sentence structure across tracks. If two tracks feel similar, find the one detail that separates them.
- Pick ONE angle per track from this list and stick to it: texture/sound, era/scene, mood shift, energy contrast, lyrical bent, production feel, regional context. Use a DIFFERENT angle for each track in the list.
- Be concrete: name the specific texture, mood, decade, or detail. Avoid generic praise ("great", "amazing", "perfect").
- Do NOT use "you" or "your" — describe the track itself, not the listener.
- Do NOT repeat the track title or artist name in your sentence.

Tracks:
${list.map((t, i) => `${i + 1}. "${t.title}" by ${t.artist} — mood: ${t.mood}, energy ${t.energy}/5${t.year ? `, ${t.year}` : ""}`).join("\n")}

Respond ONLY with a JSON array like [{"i":1,"why":"..."},{"i":2,"why":"..."}]. No prose, no markdown.`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.85,
        top_p: 0.95,
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

    // De-duplicate: if two reasons collide, replace the duplicate with fallback
    const seen = new Set();
    const reasons = list.map((t, idx) => {
      const match = parsed.find((p) => Number(p.i) === idx + 1);
      let why = match?.why || fallback()[idx].why;
      const key = why.toLowerCase().trim();
      if (seen.has(key)) why = fallback()[idx].why;
      seen.add(why.toLowerCase().trim());
      return { id: t.id, why };
    });

    return res.status(200).json({ source: "groq", reasons });
  } catch {
    return res.status(200).json({ source: "fallback", reasons: fallback() });
  }
}
