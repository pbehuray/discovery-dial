import React, { useState, useMemo, useEffect } from "react";
import { TRACKS, VIBES } from "./tracks.js";

// Build the result set: total tracks varies with dial; the dial sets the % that are "new".
function buildMix(vibeId, adventurousness) {
  const pool = TRACKS.filter((t) => t.vibe === vibeId);
  const familiar = pool.filter((t) => t.familiarity === "familiar");
  const fresh = pool.filter((t) => t.familiarity === "new");
  const TOTAL = adventurousness >= 40 ? 10 : 8;
  const newCount = Math.round((adventurousness / 100) * TOTAL);
  const famCount = TOTAL - newCount;

  const pick = (arr, n) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, arr.length));
  };
  const chosenNew = pick(fresh, newCount);
  const chosenFam = pick(familiar, famCount);
  // interleave so new tracks are sprinkled through, not dumped at the end
  const out = [];
  const maxLen = Math.max(chosenFam.length, chosenNew.length);
  for (let i = 0; i < maxLen; i++) {
    if (chosenFam[i]) out.push({ ...chosenFam[i], isNew: false });
    if (chosenNew[i]) out.push({ ...chosenNew[i], isNew: true });
  }
  return out;
}

function dialLabel(v) {
  if (v <= 10) return "Comfort";
  if (v <= 25) return "Mostly familiar";
  if (v <= 40) return "Adventurous";
  return "Maximum discovery";
}

// Generate a deterministic gradient for each track's "album art" tile
function artGradient(seed) {
  const palettes = [
    ["#7c3aed", "#3b0764"], ["#0ea5e9", "#0c4a6e"], ["#10b981", "#064e3b"],
    ["#f59e0b", "#78350f"], ["#ec4899", "#831843"], ["#ef4444", "#7f1d1d"],
    ["#8b5cf6", "#4c1d95"], ["#06b6d4", "#155e75"], ["#84cc16", "#365314"],
    ["#f97316", "#7c2d12"], ["#a855f7", "#581c87"], ["#14b8a6", "#134e4a"],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

function initials(name) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function WhyAI() {
  const [open, setOpen] = useState(false);
  return (
    <div className="whyai">
      <button className="whyai-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="whyai-icon">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="#1ed760">
            <path d="M12 2l2.39 7.36H22l-6.19 4.5L18.2 21 12 16.5 5.8 21l2.39-7.14L2 9.36h7.61L12 2z"/>
          </svg>
        </span>
        Why AI? — not just another recommendation algorithm
        <span className="whyai-chevron" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="#b3b3b3"><path d="M6 9l6 6 6-6"/></svg>
        </span>
      </button>

      {open && (
        <div className="whyai-body">
          <div className="whyai-grid">
            <div className="whyai-col whyai-col-old">
              <div className="whyai-col-head">Traditional recommendation</div>
              <ul>
                <li>Collaborative filtering: surfaces what <em>similar users</em> played next</li>
                <li>Predicts your next track from listening history patterns</li>
                <li>Optimises for immediate engagement — keeps you in your bubble</li>
                <li><strong>Cannot explain why a track belongs — it's a black box</strong></li>
                <li>Has no mechanism for the listener to steer <em>how much</em> new enters</li>
              </ul>
            </div>
            <div className="whyai-col whyai-col-new">
              <div className="whyai-col-head">Discovery Dial + AI</div>
              <ul>
                <li>Listener sets the discovery level — the dial is explicit control</li>
                <li>LLM reasons over each new track's mood, energy, era, and scene</li>
                <li>Generates a per-track sentence: <em>why this track, in this vibe, right now</em></li>
                <li><strong>Turns "algorithm black box" into "discovery you can trust"</strong></li>
                <li>Explainability was previously impossible at scale without AI</li>
              </ul>
            </div>
          </div>
          <div className="whyai-note">
            Prototype scope: vibe + dial as personalization signal. Production: plug into Spotify's
            existing taste graph (top artists, recent listens, skip patterns) as the AI's input.
          </div>
        </div>
      )}
    </div>
  );
}

// Sidebar playlist items (matches the real Spotify library look)
const LIBRARY = [
  { name: "Liked Songs", meta: "Playlist · 122 songs", pinned: true, palette: ["#7c3aed", "#c4b5fd"], glyph: "♥" },
  { name: "Discovery Mix", meta: "Playlist · Made for you", active: true, palette: ["#1db954", "#064e3b"], glyph: "◍" },
  { name: "GYM SONGS 🎀 (for girlies) 2026", meta: "Playlist · The music enthusiast", palette: ["#f43f5e", "#7f1d1d"] },
  { name: "Haunted — Beyoncé", meta: "Playlist · Oona Katariina Kastari", palette: ["#1f2937", "#0f172a"] },
  { name: "Flirting songs", meta: "Playlist · Bunny 🐰", palette: ["#ec4899", "#7c2d12"] },
  { name: "Tale of karma", meta: "Playlist · Dj Ashwin shetty", palette: ["#374151", "#111827"] },
  { name: "Wedding 2024", meta: "Playlist · amritansu", palette: ["#b91c1c", "#7f1d1d"] },
  { name: "Indie Essentials", meta: "Playlist · Spotify", palette: ["#0ea5e9", "#0c4a6e"] },
  { name: "Daily Mix 1", meta: "Playlist · Made for you", palette: ["#f59e0b", "#78350f"] },
];

export default function App() {
  const [vibeId, setVibeId] = useState("indie");
  const [adv, setAdv] = useState(25);
  const [mix, setMix] = useState([]);
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiSource, setAiSource] = useState(null);
  const [libraryFilter, setLibraryFilter] = useState("Playlists");
  const vibe = useMemo(() => VIBES.find((v) => v.id === vibeId), [vibeId]);

  async function generate() {
    const next = buildMix(vibeId, adv);
    setMix(next);
    setReasons({});
    setAiSource(null);
    const newOnes = next.filter((t) => t.isNew);
    if (newOnes.length === 0) return;
    setLoading(true);
    try {
      const r = await fetch("/api/reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibeLabel: vibe.label,
          vibeSeed: vibe.seed,
          tracks: newOnes.map((t) => ({ id: t.id, title: t.title, artist: t.artist, mood: t.mood, energy: t.energy, year: t.year })),
        }),
      });
      const data = await r.json();
      const map = {};
      (data.reasons || []).forEach((x) => { map[x.id] = x.why; });
      setReasons(map);
      setAiSource(data.source);
    } catch {
      setAiSource("fallback");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { generate(); /* eslint-disable-next-line */ }, []);

  const newCount = mix.filter((t) => t.isNew).length;
  const nowPlaying = mix[0];
  const nowPlayingPalette = nowPlaying ? artGradient(nowPlaying.artist) : ["#7c3aed", "#3b0764"];

  return (
    <div className="sp-app">
      {/* TOP BAR */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="sp-logo" aria-label="Spotify">
            <svg viewBox="0 0 168 168" width="32" height="32"><path fill="#1ED760" d="M83.996.277C37.747.277.253 37.77.253 84.019c0 46.251 37.494 83.741 83.743 83.741 46.254 0 83.744-37.49 83.744-83.741 0-46.246-37.49-83.738-83.745-83.738l.001-.004zm38.404 120.78a5.217 5.217 0 01-7.18 1.73c-19.662-12.01-44.414-14.73-73.564-8.07a5.222 5.222 0 01-6.249-3.93 5.213 5.213 0 013.926-6.25c31.9-7.291 59.263-4.15 81.337 9.34 2.46 1.51 3.24 4.72 1.73 7.18zm10.25-22.805c-1.89 3.075-5.91 4.045-8.98 2.155-22.51-13.83-56.823-17.84-83.448-9.764-3.453 1.043-7.1-.903-8.148-4.35a6.538 6.538 0 014.354-8.143c30.413-9.228 68.222-4.758 94.072 11.127 3.07 1.89 4.04 5.91 2.15 8.976v-.001zm.88-23.744c-26.99-16.031-71.52-17.505-97.289-9.684-4.138 1.255-8.514-1.081-9.768-5.219a7.835 7.835 0 015.221-9.771c29.581-8.98 78.756-7.245 109.83 11.202a7.823 7.823 0 012.74 10.733c-2.2 3.722-7.02 4.949-10.73 2.739z"/></svg>
          </div>
        </div>

        <div className="topbar-center">
          <button className="tb-icon-btn" aria-label="Home" title="Home">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12.5 3.247a1 1 0 00-1 0L4 7.577V20h4.5v-6a1 1 0 011-1h5a1 1 0 011 1v6H20V7.577l-7.5-4.33zm-2-1.732a3 3 0 013 0L21 6.181a1 1 0 01.5.866V21a1 1 0 01-1 1h-6.5a1 1 0 01-1-1v-6h-3v6a1 1 0 01-1 1H3.5a1 1 0 01-1-1V7.047a1 1 0 01.5-.866l7.5-4.666z"/></svg>
          </button>
          <div className="tb-search">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#b3b3b3"><path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 101.414-1.414l-4.344-4.344a9.157 9.157 0 002.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.28 7.407-7.28s7.407 3.274 7.407 7.28-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.28z"/></svg>
            <input placeholder="What do you want to play?" />
            <span className="tb-search-divider" />
            <button className="tb-browse" aria-label="Browse">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#b3b3b3"><path d="M15 15.5h-2v-7h2v7zm-4 0H9v-3h2v3zM3 3h18v18H3V3zm2 2v14h14V5H5z"/></svg>
            </button>
          </div>
        </div>

        <div className="topbar-right">
          <button className="tb-pill-light">Explore Premium</button>
          <button className="tb-pill-ghost">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zM4 18h16v2H4z"/></svg>
            Install App
          </button>
          <button className="tb-circle" aria-label="Notifications">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M11.998 1.04a8.96 8.96 0 00-8.96 8.96v3.764L1.232 16.5c-.413.673.071 1.54.859 1.54h5.012a4.898 4.898 0 009.79 0h5.012c.788 0 1.272-.867.859-1.54l-1.806-2.736V10A8.96 8.96 0 0011.998 1.04zm0 19a2.898 2.898 0 01-2.83-2.5h5.66a2.898 2.898 0 01-2.83 2.5z"/></svg>
          </button>
          <button className="tb-circle" aria-label="Friend activity">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M9 11a4 4 0 100-8 4 4 0 000 8zm0 2c-3.31 0-6 1.79-6 4v3h12v-3c0-2.21-2.69-4-6-4zm9-2c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4zm0 2c-.7 0-1.36.08-1.97.23.61.99.97 2.12.97 3.27v3h6v-3c0-2.21-2.69-4-5-4z"/></svg>
          </button>
          <button className="tb-avatar" aria-label="Profile">P</button>
        </div>
      </div>

      {/* MAIN GRID: sidebar + content + right panel */}
      <div className="grid">
        {/* LEFT SIDEBAR */}
        <aside className="sidebar">
          <div className="lib-head">
            <div className="lib-title">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#b3b3b3"><path d="M3 22a1 1 0 01-1-1V3a1 1 0 012 0v18a1 1 0 01-1 1zm6.5 0a1 1 0 01-1-1V3a1 1 0 012 0v18a1 1 0 01-1 1zM20 22H14a1 1 0 01-1-1V3a1 1 0 011-1h6a1 1 0 011 1v18a1 1 0 01-1 1z"/></svg>
              Your Library
            </div>
            <div className="lib-tools">
              <button className="lib-tool" title="Create">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M12 4a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6V5a1 1 0 011-1z"/></svg>
                Create
              </button>
              <button className="lib-tool-icon" title="Expand">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M7.404 4.343a.75.75 0 010 1.06L3.811 9h12.378l-3.593-3.596a.75.75 0 011.061-1.06L19.06 9.586a1 1 0 010 1.414l-5.404 5.243a.75.75 0 11-1.06-1.061L16.19 11.5H3.81l3.594 3.682a.75.75 0 11-1.06 1.06L.94 11a1 1 0 010-1.414l5.404-5.243a.75.75 0 011.06 0z"/></svg>
              </button>
            </div>
          </div>

          <div className="lib-filters">
            {["Playlists", "Artists", "Albums"].map((f) => (
              <button key={f}
                      className={"lib-chip" + (libraryFilter === f ? " on" : "")}
                      onClick={() => setLibraryFilter(f)}>{f}</button>
            ))}
          </div>

          <div className="lib-search-row">
            <button className="lib-search-icon" title="Search in library">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 101.414-1.414l-4.344-4.344a9.157 9.157 0 002.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.28 7.407-7.28s7.407 3.274 7.407 7.28-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.28z"/></svg>
            </button>
            <span className="lib-recents">Recents
              <svg viewBox="0 0 16 16" width="14" height="14" fill="#b3b3b3"><path d="M15 14.5H1V13h14v1.5zM15 9H1V7.5h14V9zm0-5.5H1V2h14v1.5z"/></svg>
            </span>
          </div>

          <ul className="lib-list">
            {LIBRARY.map((item, i) => (
              <li key={i} className={"lib-item" + (item.active ? " on" : "")}>
                <div className="lib-art"
                     style={{
                       background: `linear-gradient(135deg, ${item.palette[0]}, ${item.palette[1]})`,
                     }}>
                  {item.glyph && <span className="lib-art-glyph">{item.glyph}</span>}
                </div>
                <div className="lib-meta">
                  <div className="lib-name">
                    {item.pinned && <span className="lib-pin">📌</span>}
                    {item.name}
                  </div>
                  <div className="lib-sub">{item.meta}</div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* MAIN CONTENT (playlist page) */}
        <main className="content">
          <div className="content-scroll">
            {/* PLAYLIST HERO */}
            <div className="hero">
              <div className="hero-bg" />
              <div className="hero-inner">
                <div className="hero-art">
                  <svg viewBox="0 0 64 64" width="120" height="120">
                    <defs>
                      <linearGradient id="dialArt" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#1ed760"/>
                        <stop offset="1" stopColor="#0a6b32"/>
                      </linearGradient>
                    </defs>
                    <circle cx="32" cy="32" r="22" fill="none" stroke="url(#dialArt)" strokeWidth="3"/>
                    <line x1="32" y1="14" x2="32" y2="50" stroke="#0a6b32" strokeWidth="2"/>
                    <line x1="24" y1="16" x2="24" y2="48" stroke="#0a6b32" strokeWidth="2"/>
                    <line x1="40" y1="16" x2="40" y2="48" stroke="#0a6b32" strokeWidth="2"/>
                    <circle cx="32" cy="32" r="4" fill="#1ed760"/>
                  </svg>
                </div>
                <div className="hero-text">
                  <div className="hero-type">Playlist</div>
                  <h1 className="hero-title">Discovery Mix</h1>
                  <div className="hero-desc">Tuned to your dial — fresh music, on your terms. Every new track explained.</div>
                  <div className="hero-meta">
                    <span className="hero-creator">
                      <span className="hero-creator-dot" />
                      Made for <strong>purbasha</strong>
                    </span>
                    <span className="dot">·</span>
                    <span>{mix.length} songs</span>
                    <span className="dot">·</span>
                    <span><strong className="hero-new">{newCount} new</strong> mixed in</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BAR */}
            <div className="action-bar">
              <button className="play-fab" aria-label="Play">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#000"><path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"/></svg>
              </button>
              <button className="ab-icon" aria-label="Add">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#b3b3b3" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8" stroke="#b3b3b3" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
              <button className="ab-icon" aria-label="More">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#b3b3b3"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
              </button>
              <div className="ab-spacer" />
              <button className="ab-view">
                List
                <svg viewBox="0 0 16 16" width="14" height="14" fill="#b3b3b3"><path d="M15 14.5H1V13h14v1.5zM15 9H1V7.5h14V9zm0-5.5H1V2h14v1.5z"/></svg>
              </button>
            </div>

            {/* DIAL CARD */}
            <section className="dial-card">
              <div className="dial-card-left">
                <div className="dial-card-head">
                  <span className="dial-card-eyebrow">Discovery Dial</span>
                  <span className="dial-card-state">{dialLabel(adv)} · <strong>{adv}% new</strong></span>
                </div>
                <input
                  type="range" min="0" max="50" step="5" value={adv}
                  onChange={(e) => setAdv(Number(e.target.value))}
                  className="dial-slider"
                  style={{ "--fill": `${(adv / 50) * 100}%` }}
                />
                <div className="dial-ends">
                  <span>Comfort</span><span>Maximum discovery</span>
                </div>
              </div>
              <div className="dial-card-right">
                <div className="vibes">
                  {VIBES.slice(0, 6).map((v) => (
                    <button
                      key={v.id}
                      className={"vibe-chip" + (v.id === vibeId ? " on" : "")}
                      onClick={() => setVibeId(v.id)}
                    >
                      {v.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
                <button className="build-btn" onClick={generate} disabled={loading}>
                  {loading ? "Tuning…" : "▸ Build mix"}
                </button>
              </div>
            </section>

            {/* WHY AI EXPLAINER */}
            <WhyAI />

            {/* AI BANNER */}
            <div className="ai-banner">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#1ed760"><path d="M12 2l2.39 7.36H22l-6.19 4.5L18.2 21 12 16.5 5.8 21l2.39-7.14L2 9.36h7.61L12 2z"/></svg>
              {aiSource === "groq" ? "AI relevance live — each new pick explained" : "AI relevance active — each new pick explained"}
            </div>

            {/* TRACK TABLE */}
            <div className="tracks">
              <div className="tracks-head">
                <div className="th th-num">#</div>
                <div className="th th-title">Title</div>
                <div className="th th-album">Album</div>
                <div className="th th-tag">Tag</div>
                <div className="th th-year" title="Year">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="#b3b3b3"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5A6.5 6.5 0 118 1.5a6.5 6.5 0 010 13zM8 3a.75.75 0 01.75.75v4.19l2.53 1.46a.75.75 0 11-.75 1.3l-2.91-1.68a.75.75 0 01-.37-.65V3.75A.75.75 0 018 3z"/></svg>
                </div>
              </div>
              <div className="tracks-divider" />
              {mix.map((t, i) => {
                const [c1, c2] = artGradient(t.artist);
                const isPlaying = i === 0;
                return (
                  <div key={t.id + i} className={"trow" + (isPlaying ? " playing" : "")}>
                    <div className="tc tc-num">
                      {isPlaying
                        ? (<span className="eq"><i/><i/><i/></span>)
                        : (i + 1)}
                    </div>
                    <div className="tc tc-title">
                      <div className="tc-art" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                        {initials(t.artist)}
                      </div>
                      <div className="tc-text">
                        <div className={"tc-name" + (isPlaying ? " green" : "")}>{t.title}</div>
                        <div className="tc-artist">{t.artist}</div>
                        {t.isNew && (
                          <div className="tc-why">
                            <span className="ai-tag">AI</span>
                            {loading && !reasons[t.id]
                              ? "Reasoning over fresh tracks…"
                              : reasons[t.id] || "Picked to fit your vibe but expand your taste."}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="tc tc-album">{vibe?.label.split(" ")[0]} mix</div>
                    <div className="tc tc-tag">
                      {t.isNew
                        ? <span className="badge new">New</span>
                        : <span className="badge-fam">In rotation</span>}
                    </div>
                    <div className="tc tc-year">{t.year}</div>
                  </div>
                );
              })}
            </div>

            <div className="foot-note">
              Concept feature · not affiliated with Spotify · representative track pool
            </div>
          </div>
        </main>

        {/* RIGHT NOW PLAYING PANEL */}
        <aside className="rightpanel">
          <div className="rp-head">
            <div className="rp-title">{nowPlaying?.title || "Discovery Mix"}</div>
            <div className="rp-tools">
              <button className="rp-tool" aria-label="More">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#b3b3b3"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
              </button>
              <button className="rp-tool" aria-label="Close">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#b3b3b3"><path d="M6.41 5L5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41 17.59 5 12 10.59z"/></svg>
              </button>
            </div>
          </div>

          <div className="rp-art" style={{
            background: `linear-gradient(135deg, ${nowPlayingPalette[0]}, ${nowPlayingPalette[1]})`
          }}>
            <span className="rp-art-init">{nowPlaying ? initials(nowPlaying.artist) : "DM"}</span>
          </div>

          <div className="rp-track">
            <div className="rp-track-name">{nowPlaying?.title || "—"}</div>
            <div className="rp-track-artist">{nowPlaying?.artist || ""}</div>
          </div>

          <div className="rp-card">
            <div className="rp-card-head">
              <span>About the artist</span>
            </div>
            <div className="rp-artist-bg" style={{
              background: `linear-gradient(180deg, ${nowPlayingPalette[0]}55, ${nowPlayingPalette[1]}aa)`
            }}>
              <div className="rp-artist-listeners">2,143,508 monthly listeners</div>
            </div>
            <div className="rp-artist-body">
              <p>Sits comfortably inside the <strong>{vibe?.label.toLowerCase()}</strong> world — the dial keeps adding adjacent voices that share the mood but stretch it.</p>
            </div>
          </div>

          <div className="rp-card">
            <div className="rp-card-head">
              <span>Next from your dial</span>
              <span className="rp-card-link">Show all</span>
            </div>
            <div className="rp-next">
              {mix.slice(1, 4).map((t) => {
                const [c1, c2] = artGradient(t.artist);
                return (
                  <div key={t.id} className="rp-next-row">
                    <div className="rp-next-art" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                      {initials(t.artist)}
                    </div>
                    <div className="rp-next-meta">
                      <div className="rp-next-name">{t.title}</div>
                      <div className="rp-next-artist">{t.artist}{t.isNew ? " · new" : ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* BOTTOM NOW PLAYING BAR */}
      <div className="nowbar">
        <div className="nb-left">
          <div className="nb-art" style={{
            background: `linear-gradient(135deg, ${nowPlayingPalette[0]}, ${nowPlayingPalette[1]})`
          }}>
            <span className="nb-art-init">{nowPlaying ? initials(nowPlaying.artist) : "DM"}</span>
          </div>
          <div className="nb-meta">
            <div className="nb-title">{nowPlaying?.title || "Discovery Mix"}</div>
            <div className="nb-artist">{nowPlaying?.artist || "Made for you"}</div>
          </div>
          <button className="nb-icon" aria-label="Add to library">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#b3b3b3" strokeWidth="1.7"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8" strokeLinecap="round"/></svg>
          </button>
          <button className="nb-icon" aria-label="Picture-in-picture">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M3 5h18v14H3V5zm2 2v10h14V7H5zm8 4h6v4h-6v-4z"/></svg>
          </button>
        </div>

        <div className="nb-center">
          <div className="nb-controls">
            <button className="nb-ctrl" aria-label="Shuffle">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#1ed760"><path d="M13.151 4.5l1.064-1.5H21v3h-4.999l-1.064 1.5h-1.786zm6.788 0v3l3-1.5-3-1.5zM3 7h4.999l4.063 5.5L7.999 18H3v-3h2.999l1.999-2.5L5.999 10H3V7zm17 9.5l-1.064-1.5h-2.93l3.057 4.5h2.937v-3H20.94z"/></svg>
            </button>
            <button className="nb-ctrl" aria-label="Previous">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M3.3 1a.7.7 0 01.7.7v5.15l9.95-5.744a.7.7 0 011.05.606v12.575a.7.7 0 01-1.05.607L4 8.149V13.3a.7.7 0 01-.7.7H1.7a.7.7 0 01-.7-.7V1.7a.7.7 0 01.7-.7h1.6z"/></svg>
            </button>
            <button className="nb-play" aria-label="Play">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#000"><path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"/></svg>
            </button>
            <button className="nb-ctrl" aria-label="Next">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M20.7 1a.7.7 0 00-.7.7v5.15L10.05 1.106a.7.7 0 00-1.05.606v12.575a.7.7 0 001.05.607L20 8.149V13.3a.7.7 0 00.7.7h1.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-1.6z" transform="rotate(180 12 12)"/></svg>
            </button>
            <button className="nb-ctrl" aria-label="Repeat">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M0 4.75A3.75 3.75 0 013.75 1h16.5A3.75 3.75 0 0124 4.75v5a3.75 3.75 0 01-3.75 3.75H5.81l2.47 2.47a.75.75 0 11-1.06 1.06L3.4 13.21a.75.75 0 010-1.06l3.82-3.82a.75.75 0 011.06 1.06L5.81 12h14.44a2.25 2.25 0 002.25-2.25v-5a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 4.75v5a.75.75 0 01-1.5 0v-5z"/></svg>
            </button>
          </div>
          <div className="nb-scrub">
            <span className="nb-time">1:24</span>
            <div className="nb-track">
              <div className="nb-track-fill" />
              <div className="nb-track-knob" />
            </div>
            <span className="nb-time">3:48</span>
          </div>
        </div>

        <div className="nb-right">
          <button className="nb-icon" aria-label="Now playing view"><svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M11.196 8L15 14H7.196l4-6z"/></svg></button>
          <button className="nb-icon" aria-label="Lyrics"><svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M14 13.5h-2v3h2v-3zm-2-2h2v-2h-2v2zM4 4v16h16V4H4zm14 14H6V6h12v12z"/></svg></button>
          <button className="nb-icon" aria-label="Queue"><svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M15 15H3v2h12v-2zm0-4H3v2h12v-2zM3 7v2h12V7H3zm14 0v2h2V7h-2zm0 6h2v-2h-2v2zm0 4h2v-2h-2v2z"/></svg></button>
          <button className="nb-icon" aria-label="Connect to a device"><svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M6 2.75A.75.75 0 016.75 2h10.5a.75.75 0 01.75.75v18.5a.75.75 0 01-1.28.53L12 17.06l-4.72 4.72A.75.75 0 016 21.25V2.75z"/></svg></button>
          <div className="nb-vol">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M9.741.85a.75.75 0 01.375.65v21a.75.75 0 01-1.125.65l-6.925-4H1.25a.75.75 0 01-.75-.75v-12.5a.75.75 0 01.75-.75h.816L8.99 1.15a.75.75 0 01.751-.3zM14.45 6.5a.75.75 0 011.05-.15 9.97 9.97 0 014 8c0 3.2-1.52 6.05-3.86 7.86a.75.75 0 11-.92-1.18A8.47 8.47 0 0018 14.35a8.47 8.47 0 00-3.4-6.78.75.75 0 01-.15-1.07z"/></svg>
            <div className="nb-voltrack">
              <div className="nb-volfill" />
              <div className="nb-volknob" />
            </div>
          </div>
          <button className="nb-icon" aria-label="Fullscreen"><svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3"><path d="M3 3h7v2H5v5H3V3zm11 0h7v7h-2V5h-5V3zM3 14h2v5h5v2H3v-7zm16 0h2v7h-7v-2h5v-5z"/></svg></button>
        </div>
      </div>
    </div>
  );
}
