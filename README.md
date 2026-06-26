# Discovery Dial — interactive prototype

An interactive prototype for a Spotify music-discovery feature: a **dial** that lets active
explorers control how much new, unfamiliar music gets mixed into their listening — while an
AI relevance layer keeps every new track matched to their chosen vibe. Discovery you steer,
not noise.

Built for the NextLeap PM graduation project (Spotify track). Demonstrates the validated
solution: explorers want fresh music **and** control, with novelty that stays relevant.

## What it does

- Pick a **vibe** (indie, ambient, techno, hyperpop, jazz, shoegaze)
- Set the **discovery dial** from Comfort (all familiar) to Maximum discovery (up to 50% new)
- Get a mix where new tracks are surfaced alongside familiar ones
- An **LLM (Groq / Llama 3.3)** reasons over each new track and explains *why it fits the vibe
  but expands your taste* — the "relevant, not random" guarantee

## Tech

- React + Vite (frontend)
- Vercel serverless function (`/api/reason`) calling Groq for relevance reasoning
- Deterministic fallback so the demo never breaks if the API key/quota is unavailable

## Run locally

```bash
npm install
npm run dev
```

For live AI reasoning locally, set `GROQ_API_KEY` in a `.env` file (optional — it falls back
gracefully without one).

## Deploy (Vercel)

1. Push this folder to a GitHub repo.
2. On vercel.com → New Project → import the repo.
3. Add an environment variable `GROQ_API_KEY` (from console.groq.com/keys) — optional but
   enables live AI reasoning.
4. Deploy. Vercel gives you a public URL.

## Note

This is a prototype. The track pool is a curated, representative dataset (not a live Spotify
catalog), which keeps the demo fast and reliable. The AI relevance reasoning is real.
