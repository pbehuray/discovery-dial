import { useState, useEffect, useRef } from "react";
import { TRACKS, VIBES } from "./tracks.js";

const PLAYLISTS = [
  { id:"p1", name:"GYM SONGS 💪 (for girlies) 2026", sub:"Playlist · The music enthusiast", color:"#c8102e", emoji:"💪" },
  { id:"p2", name:"Liked Songs", sub:"Playlist · 122 songs", color:"#4B0082", emoji:"♥" },
  { id:"p3", name:"Haunted — Beyoncé", sub:"Playlist · Oona Katariina Kastari", color:"#8B0000", emoji:"👻" },
  { id:"p4", name:"Flirting songs", sub:"Playlist · Bunny 🐰", color:"#ff69b4", emoji:"💕" },
  { id:"p5", name:"Tale of karma", sub:"Playlist · Dj Ashwin shetty", color:"#ff6600", emoji:"🎵" },
  { id:"p6", name:"Wedding 2024", sub:"Playlist · amritansu", color:"#8B6914", emoji:"💒" },
  { id:"p7", name:"Discovery Mix ✦", sub:"Playlist · Made for purbasha", color:"#1DB954", emoji:"◎", isDiscovery:true },
];

const VIBE_LABELS = {
  indie:"Indie", ambient:"Ambient", techno:"Late-night", hyperpop:"Hyperpop", jazz:"Jazz", shoegaze:"Shoegaze"
};

// Relevance tier order for sorting: high first, medium second, low last
const REL_ORDER = { high: 0, medium: 1, low: 2 };

const RELEVANCE_STYLE = {
  high:   { label:"Strong match", color:"#1DB954", star:"★" },
  medium: { label:"Good match",   color:"#d9c75a", star:"★" },
  low:    { label:"Wider stretch",color:"#e08a4f", star:"★" },
};

function buildMix(activeVibes, dialPct) {
  const vibeSet = activeVibes.length ? activeVibes : ["indie"];
  const pool = TRACKS.filter(t => vibeSet.includes(t.vibe));
  const familiar = pool.filter(t => t.familiarity === "familiar");
  const newTracks = pool.filter(t => t.familiarity === "new");
  const total = dialPct >= 40 ? 10 : 8;
  const newCount = Math.round(total * (dialPct / 100));
  const famCount = total - newCount;
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  const picked = [
    ...shuffle(familiar).slice(0, famCount),
    ...shuffle(newTracks).slice(0, newCount),
  ];
  return shuffle(picked);
}

function relevanceScore(track, activeVibes) {
  if (!activeVibes.includes(track.vibe)) return "low";
  const pool = TRACKS.filter(t => activeVibes.includes(t.vibe) && t.familiarity === "familiar");
  if (!pool.length) return "medium";
  const avgEnergy = pool.reduce((sum, t) => sum + t.energy, 0) / pool.length;
  const diff = Math.abs(track.energy - avgEnergy);
  if (diff <= 0.75) return "high";
  if (diff <= 1.75) return "medium";
  return "low";
}

export default function App() {
  const [activeVibes, setActiveVibes]   = useState(["indie"]);
  const [dial, setDial]                 = useState(25);
  const [mix, setMix]                   = useState([]);
  const [reasons, setReasons]           = useState({});
  const [aiSource, setAiSource]         = useState(null);
  const [loading, setLoading]           = useState(false);
  const [playing, setPlaying]           = useState(null);
  const [activePlaylist, setActivePlaylist] = useState("p7");
  const sliderRef = useRef(null);

  // ── Relevance filter state ─────────────────────────────────────────
  // null = show all; "high" = strong only; "medium" = good only; "both" = strong+good
  const [relFilter, setRelFilter] = useState(null);

  // ── Save / Skip — SESSION-WIDE ────────────────────────────────────
  const [saved, setSaved]         = useState(new Set());
  const [skipped, setSkipped]     = useState(new Set());
  const [allNewSeen, setAllNewSeen] = useState(new Map());

  // ── Playlist creator state ────────────────────────────────────────
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistName, setPlaylistName]           = useState("");
  const [userPlaylists, setUserPlaylists]         = useState([]);
  // trackId being added to playlist (from row "+" button)
  const [addToPlaylistTrackId, setAddToPlaylistTrackId] = useState(null);
  const [showAddMenu, setShowAddMenu]             = useState(null); // trackId with open menu

  const dialLabel = dial <= 15 ? "Comfort zone" : dial <= 35 ? "Mostly familiar" : dial <= 60 ? "Adventurous" : "Maximum discovery";
  const newCount  = mix.filter(t => t.familiarity === "new").length;
  const currentTrack = playing || mix[0] || { title:"Discovery Mix", artist:"purbasha" };

  const newSeenCount  = allNewSeen.size;
  const newSavedCount = [...allNewSeen.keys()].filter(id => saved.has(id)).length;

  const vibeLabel = activeVibes.map(id => VIBES.find(v => v.id === id)?.label).filter(Boolean).join(" + ");
  const vibeSeed  = activeVibes.map(id => VIBES.find(v => v.id === id)?.seed).filter(Boolean).join(", ");

  // ── Sorted + filtered display list ───────────────────────────────
  // New tracks sorted by relevance (Strong→Good→Wider stretch).
  // Familiar tracks stay in their original shuffled order.
  // New tracks are then interleaved between familiar ones evenly,
  // so the mix feels like a real playlist — not a discovery dump on top.
  // When a filter is active, only matching new tracks are interleaved;
  // familiar tracks always remain visible as the anchor.
  const displayMix = (() => {
    // Score all new tracks
    const newTracks = mix
      .filter(t => t.familiarity === "new")
      .map(t => ({ ...t, _rel: relevanceScore(t, activeVibes) }))
      .sort((a, b) => REL_ORDER[a._rel] - REL_ORDER[b._rel]);

    const familiarTracks = mix.filter(t => t.familiarity === "familiar");

    // Apply relevance filter — familiar always shown
    const filteredNew = !relFilter
      ? newTracks
      : newTracks.filter(t =>
          relFilter === "high"   ? t._rel === "high"   :
          relFilter === "medium" ? t._rel === "medium" :
          relFilter === "low"    ? t._rel === "low"    : true
        );

    // Interleave: spread new tracks evenly between familiar ones.
    // e.g. 5 familiar + 3 new → F N F F N F F N
    if (!filteredNew.length) return familiarTracks;
    if (!familiarTracks.length) return filteredNew;

    const result = [];
    const total = familiarTracks.length + filteredNew.length;
    // Place a new track every N slots where N = total / newCount
    const step = total / filteredNew.length;
    let newIdx = 0;
    let famIdx = 0;
    let nextNewAt = step / 2; // start mid-gap so first slot is usually familiar

    for (let i = 0; i < total; i++) {
      if (newIdx < filteredNew.length && i >= Math.round(nextNewAt) - 1) {
        result.push(filteredNew[newIdx++]);
        nextNewAt += step;
      } else if (famIdx < familiarTracks.length) {
        result.push(familiarTracks[famIdx++]);
      } else {
        result.push(filteredNew[newIdx++]);
      }
    }
    return result;
  })();

  async function rebuild() {
    const newMix = buildMix(activeVibes, dial);
    setMix(newMix);
    setReasons({});
    setAiSource(null);
    setPlaying(null); // ← BUILD does NOT auto-play; user chooses what to play
    setAllNewSeen(prev => {
      const next = new Map(prev);
      newMix.filter(t => t.familiarity === "new").forEach(t => next.set(t.id, t));
      return next;
    });
    const newOnes = newMix.filter(t => t.familiarity === "new");
    if (!newOnes.length) return;
    setLoading(true);
    try {
      const r = await fetch("/api/reason", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          vibeLabel, vibeSeed,
          tracks: newOnes.map(t => ({ id:t.id, title:t.title, artist:t.artist, mood:t.mood, energy:t.energy, year:t.year })),
        }),
      });
      const data = await r.json();
      const map = {};
      (data.reasons || []).forEach(x => { map[x.id] = x.why; });
      setReasons(map);
      setAiSource(data.source);
    } catch { setAiSource("fallback"); }
    finally  { setLoading(false); }
  }

  useEffect(() => { rebuild(); }, []);

  function toggleVibe(v) {
    setActiveVibes(prev =>
      prev.includes(v)
        ? prev.length > 1 ? prev.filter(x => x !== v) : prev
        : [...prev, v]
    );
  }

  function handleSliderClick(e) {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    setDial(pct);
  }

  function toggleSave(trackId, e) {
    e.stopPropagation();
    setSaved(prev => {
      const next = new Set(prev);
      next.has(trackId) ? next.delete(trackId) : next.add(trackId);
      return next;
    });
  }

  function playNext(fromTrack) {
    if (!mix.length) return;
    const idx = mix.findIndex(t => t.id === fromTrack?.id);
    const next = mix[(idx + 1) % mix.length];
    setPlaying(next);
  }

  function handleSkip(e) {
    e?.stopPropagation?.();
    const st = currentTrack;
    if (st?.id) setSkipped(prev => new Set(prev).add(st.id));
    playNext(st);
  }

  function handlePrev(e) {
    e?.stopPropagation?.();
    if (!mix.length) return;
    const idx = mix.findIndex(t => t.id === currentTrack?.id);
    setPlaying(mix[(idx - 1 + mix.length) % mix.length]);
  }

  // ── Playlist helpers ──────────────────────────────────────────────
  function createPlaylist() {
    const name = playlistName.trim() || `My Discovery Playlist ${userPlaylists.length + 1}`;
    const newPl = { id:`up${Date.now()}`, name, tracks:[] };
    setUserPlaylists(prev => [...prev, newPl]);
    setPlaylistName("");
    setShowPlaylistModal(false);
    return newPl.id;
  }

  function addTrackToPlaylist(playlistId, trackId, e) {
    e.stopPropagation();
    setUserPlaylists(prev => prev.map(pl =>
      pl.id === playlistId && !pl.tracks.includes(trackId)
        ? { ...pl, tracks:[...pl.tracks, trackId] }
        : pl
    ));
    setShowAddMenu(null);
  }

  function toggleAddMenu(trackId, e) {
    e.stopPropagation();
    setShowAddMenu(prev => prev === trackId ? null : trackId);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#000", color:"#fff", fontFamily:"'Circular Std','Helvetica Neue',Arial,sans-serif", overflow:"hidden" }}
      onClick={() => setShowAddMenu(null)}>

      {/* TOP BAR */}
      <div style={{ height:64, background:"#000", display:"flex", alignItems:"center", padding:"0 16px", gap:8, flexShrink:0, zIndex:10 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        <button style={{ background:"rgba(0,0,0,0.7)", border:"none", color:"#fff", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:18 }}>‹</button>
        <button style={{ background:"rgba(0,0,0,0.7)", border:"none", color:"#b3b3b3", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:18 }}>›</button>
        <div style={{ flex:1, maxWidth:380, position:"relative", margin:"0 auto" }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14 }}>🔍</span>
          <input placeholder="What do you want to play?" style={{ width:"100%", padding:"10px 16px 10px 36px", borderRadius:500, background:"#fff", border:"none", fontSize:14, color:"#000", boxSizing:"border-box", outline:"none" }}/>
          <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#000", fontSize:16 }}>⊞</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
          <button style={{ background:"#fff", color:"#000", border:"none", borderRadius:500, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Explore Premium</button>
          <button style={{ background:"transparent", color:"#fff", border:"1px solid #fff", borderRadius:500, padding:"8px 14px", fontWeight:700, fontSize:13, cursor:"pointer" }}>↓ Install App</button>
          <div style={{ width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18 }}>🔔</div>
          <div style={{ width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18 }}>👥</div>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#532683", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, cursor:"pointer" }}>P</div>
        </div>
      </div>

      {/* MAIN 3-COLUMN */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", gap:8, padding:"0 8px 8px" }}>

        {/* LEFT — Your Library */}
        <div style={{ width:280, background:"#121212", borderRadius:8, display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>
          <div style={{ padding:"16px 16px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontWeight:700, fontSize:15 }}>☰ Your Library</div>
            <div style={{ display:"flex", gap:6 }}>
              <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:22, cursor:"pointer" }}>+</button>
              <span style={{ color:"#b3b3b3", fontSize:13, cursor:"pointer", alignSelf:"center" }}>Create</span>
              <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>⤢</button>
            </div>
          </div>
          <div style={{ padding:"0 16px 8px", display:"flex", gap:6 }}>
            {["Playlists","Artists","Albums"].map(f => (
              <button key={f} style={{ background:f==="Playlists"?"#fff":"#2a2a2a", color:f==="Playlists"?"#000":"#fff", border:"none", borderRadius:500, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{f}</button>
            ))}
          </div>
          <div style={{ padding:"0 16px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>🔍</button>
            <span style={{ color:"#b3b3b3", fontSize:12, cursor:"pointer" }}>Recents ☰</span>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"0 8px" }}>
            {PLAYLISTS.map(pl => (
              <div key={pl.id} onClick={() => setActivePlaylist(pl.id)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"8px", borderRadius:4, cursor:"pointer", background:activePlaylist===pl.id?"#2a2a2a":"transparent" }}>
                <div style={{ width:48, height:48, borderRadius:4, background:pl.isDiscovery?"#1DB954":pl.color||"#333", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                  {pl.isDiscovery ? "◎" : pl.emoji}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:500, color:pl.isDiscovery?"#1DB954":"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pl.name}</div>
                  <div style={{ fontSize:12, color:"#b3b3b3", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pl.sub}</div>
                </div>
              </div>
            ))}
            {/* User-created playlists */}
            {userPlaylists.map(pl => (
              <div key={pl.id}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"8px", borderRadius:4, cursor:"pointer" }}>
                <div style={{ width:48, height:48, borderRadius:4, background:"#2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🎵</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:500, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pl.name}</div>
                  <div style={{ fontSize:12, color:"#b3b3b3" }}>Playlist · {pl.tracks.length} songs</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER */}
        <div style={{ flex:1, background:"#121212", borderRadius:8, overflowY:"auto" }}>
          <div style={{ background:"linear-gradient(180deg,#1a3a2e 0%,#121212 100%)", padding:"24px 24px 0" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:24 }}>
              {[
                { name:"GYM SONGS 💪 (for girlies) 2026", color:"#c8102e", emoji:"💪" },
                { name:"Liked Songs", color:"#4B0082", emoji:"♥" },
                { name:"The Summer I Turned Pretty", color:"#8B4513", emoji:"🌸" },
                { name:"Shree Hanuman Chalisa", color:"#ff6600", emoji:"🙏" },
                { name:"Slow Coffee, Slow Heart", color:"#006400", emoji:"☕" },
                { name:"Ep. 17: Ritika Saraf", color:"#4169E1", emoji:"🎙️" },
              ].map((item,i) => (
                <div key={i} style={{ background:"rgba(255,255,255,0.1)", borderRadius:4, display:"flex", alignItems:"center", gap:8, padding:"4px 12px 4px 4px", cursor:"pointer" }}>
                  <div style={{ width:48, height:48, background:item.color, borderRadius:4, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{item.emoji}</div>
                  <span style={{ fontSize:13, fontWeight:700, lineHeight:1.2 }}>{item.name}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:24, marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Getting started</h2>
                </div>
                <div style={{ background:"linear-gradient(135deg,#c8a84b 0%,#8B6914 100%)", borderRadius:8, padding:16 }}>
                  <div style={{ fontSize:20, fontWeight:900, marginBottom:4 }}>1. Start playing</div>
                  <div style={{ fontSize:13, opacity:0.9, marginBottom:12 }}>Search, browse, and play your favorite artists and creators.</div>
                  <button style={{ background:"#1DB954", color:"#000", border:"none", borderRadius:500, padding:"8px 20px", fontWeight:700, fontSize:14, cursor:"pointer" }}>Search</button>
                </div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:12, color:"#b3b3b3", marginBottom:2 }}>Made For</div>
                    <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>purbasha</h2>
                  </div>
                  <span style={{ color:"#1DB954", fontSize:13, fontWeight:600, cursor:"pointer" }}>Show all</span>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  {[{n:"Daily Mix 01",a:"Arijit Singh, Himesh...",c:"#ff6600"},{n:"Daily Mix 02",a:"Olivia Rodrigo, Katy...",c:"#9B59B6"}].map((m,i) => (
                    <div key={i} style={{ flex:1, background:"#2a2a2a", borderRadius:8, padding:12, cursor:"pointer" }}>
                      <div style={{ width:"100%", paddingBottom:"100%", background:`linear-gradient(135deg,${m.c},#000)`, borderRadius:4, position:"relative", marginBottom:8 }}>
                        <div style={{ position:"absolute", top:8, left:8, background:m.c, borderRadius:4, padding:"2px 6px", fontSize:10, fontWeight:700 }}>Daily Mix</div>
                        <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.8)", borderRadius:4, padding:"2px 6px", fontSize:11, fontWeight:900 }}>0{i+1}</div>
                      </div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{m.n}</div>
                      <div style={{ fontSize:12, color:"#b3b3b3" }}>{m.a}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* DISCOVERY MIX */}
          <div style={{ padding:"0 24px 24px" }}>
            <div style={{ marginBottom:12, color:"#b3b3b3", fontSize:13, fontWeight:600, letterSpacing:1 }}>ALBUMS FEATURING SONGS YOU LIKE</div>

            <div style={{ background:"#181818", borderRadius:8, overflow:"hidden" }}>
              {/* Playlist header */}
              <div style={{ background:"linear-gradient(135deg,#1a5c2e 0%,#0d3018 100%)", padding:"20px 20px 0" }}>
                <div style={{ display:"flex", gap:16, alignItems:"flex-end", marginBottom:20 }}>
                  <div style={{ width:140, height:140, background:"#1DB954", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:56 }}>◎</span>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, letterSpacing:1, color:"rgba(255,255,255,0.7)", marginBottom:4 }}>PLAYLIST</div>
                    <h1 style={{ margin:"0 0 8px", fontSize:36, fontWeight:900, letterSpacing:-1 }}>Discovery Mix</h1>
                    <div style={{ fontSize:14, color:"rgba(255,255,255,0.7)", marginBottom:4 }}>Tuned to your dial — fresh music, on your terms.</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>
                      Made for you · {mix.length} songs · <span style={{ color:"#1DB954", fontWeight:600 }}>{newCount} new</span> mixed in
                      {newSeenCount > 0 && (
                        <span style={{ marginLeft:10, color:"rgba(255,255,255,0.55)" }}>
                          · <span style={{ color:"#1DB954", fontWeight:600 }}>{newSavedCount}/{newSeenCount}</span> new saved this session
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
                <button
                  onClick={() => playing ? setPlaying(null) : mix[0] && setPlaying(mix[0])}
                  style={{ width:56, height:56, borderRadius:"50%", background:"#1DB954", border:"none", color:"#000", fontSize:22, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                  {playing ? "⏸" : "▶"}
                </button>
                <div style={{ color:"#b3b3b3", fontSize:22, cursor:"pointer" }}>♡</div>
                {/* Create playlist button */}
                <button
                  onClick={() => setShowPlaylistModal(true)}
                  title="Save to new playlist"
                  style={{ background:"transparent", border:"1px solid #535353", borderRadius:500, color:"#b3b3b3", fontSize:12, fontWeight:600, padding:"6px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                  ＋ New playlist
                </button>
                <div style={{ color:"#b3b3b3", fontSize:18, cursor:"pointer" }}>⋯</div>
              </div>

              {/* DIAL */}
              <div style={{ margin:"0 20px 16px", background:"#282828", borderRadius:8, padding:"16px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ color:"#1DB954", fontSize:12, fontWeight:700, letterSpacing:1 }}>✦ DISCOVERY DIAL</span>
                  <span style={{ color:"#b3b3b3", fontSize:13 }}>{dialLabel} · <strong style={{ color:"#fff" }}>{dial}% new</strong></span>
                </div>
                <div ref={sliderRef} onClick={handleSliderClick}
                  style={{ position:"relative", height:4, background:"#535353", borderRadius:2, cursor:"pointer", marginBottom:8 }}>
                  <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${dial}%`, background:"#1DB954", borderRadius:2 }}/>
                  <div style={{ position:"absolute", top:"50%", left:`${dial}%`, transform:"translate(-50%,-50%)", width:16, height:16, borderRadius:"50%", background:"#fff", boxShadow:"0 2px 8px rgba(0,0,0,0.5)" }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#b3b3b3", marginBottom:12 }}>
                  <span>Comfort</span><span>Maximum discovery</span>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  {VIBES.map(v => (
                    <button key={v.id} onClick={() => toggleVibe(v.id)}
                      style={{ padding:"6px 14px", borderRadius:500, border:activeVibes.includes(v.id)?"2px solid #1DB954":"1px solid #535353", background:activeVibes.includes(v.id)?"rgba(29,185,84,0.15)":"transparent", color:activeVibes.includes(v.id)?"#1DB954":"#b3b3b3", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      {VIBE_LABELS[v.id]}
                    </button>
                  ))}
                  {/* BUILD MIX — grid icon, not play icon */}
                  <button onClick={rebuild} disabled={loading}
                    style={{ marginLeft:"auto", padding:"8px 22px", borderRadius:500, background:"#1DB954", border:"none", color:"#000", fontSize:13, fontWeight:700, cursor:"pointer", opacity:loading?0.7:1, display:"flex", alignItems:"center", gap:6 }}>
                    {loading ? "Tuning…" : <><span style={{ fontSize:15 }}>⊞</span> Build mix</>}
                  </button>
                </div>
              </div>

              {/* AI banner + relevance legend */}
              <div style={{ margin:"0 20px 8px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(29,185,84,0.12)", color:"#1DB954", fontSize:12, fontWeight:600, padding:"5px 12px", borderRadius:999 }}>
                  ★ {aiSource==="groq" ? "AI relevance live — each new pick explained" : "AI relevance active — each new pick explained"}
                </div>
                {/* Relevance legend — colour key */}
                <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:11, color:"#b3b3b3" }}>
                  {Object.entries(RELEVANCE_STYLE).map(([key, rs]) => (
                    <span key={key} style={{ display:"flex", alignItems:"center", gap:3 }}>
                      <span style={{ color:rs.color, fontSize:13 }}>★</span>
                      <span style={{ color:"#888" }}>{rs.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Relevance filter chips — 3 tiers + All */}
              <div style={{ margin:"0 20px 12px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:"#888", marginRight:4 }}>Filter:</span>
                {[
                  { key:null,     label:"All",           color:"#888" },
                  { key:"high",   label:"★ Strong match", color:"#1DB954" },
                  { key:"medium", label:"★ Good match",   color:"#d9c75a" },
                  { key:"low",    label:"★ Wider stretch",color:"#e08a4f" },
                ].map(f => (
                  <button key={String(f.key)} onClick={() => setRelFilter(f.key)}
                    style={{
                      padding:"4px 12px", borderRadius:500, fontSize:11, fontWeight:600, cursor:"pointer",
                      background: relFilter === f.key ? f.color   : "transparent",
                      color:      relFilter === f.key ? (f.key ? "#000" : "#fff") : f.color,
                      border:     `1px solid ${relFilter === f.key ? f.color : "#333"}`,
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Track list */}
              <div style={{ padding:"0 20px 20px" }}>
                <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 36px 36px 80px 60px", gap:"0 8px", padding:"8px 8px", borderBottom:"1px solid #2a2a2a", marginBottom:4 }}>
                  <div style={{ color:"#b3b3b3", fontSize:12 }}>#</div>
                  <div style={{ color:"#b3b3b3", fontSize:12 }}>TITLE</div>
                  <div/>
                  <div/>
                  <div style={{ color:"#b3b3b3", fontSize:12, textAlign:"right" }}>TAG</div>
                  <div style={{ color:"#b3b3b3", fontSize:12, textAlign:"right" }}>YEAR</div>
                </div>

                {displayMix.map((track, i) => {
                  const isPlaying  = playing?.id === track.id;
                  const isNew      = track.familiarity === "new";
                  const isSaved    = saved.has(track.id);
                  const wasSkipped = skipped.has(track.id);
                  const rel        = track._rel || (isNew ? relevanceScore(track, activeVibes) : null);
                  const relStyle   = rel ? RELEVANCE_STYLE[rel] : null;

                  return (
                    <div key={track.id} onClick={() => setPlaying(track)}
                      style={{ display:"grid", gridTemplateColumns:"28px 1fr 36px 36px 80px 60px", gap:"0 8px", padding:"10px 8px", borderRadius:4, cursor:"pointer", background:isPlaying?"rgba(255,255,255,0.07)":"transparent", alignItems:"start", opacity:wasSkipped?0.55:1, position:"relative" }}
                      onMouseEnter={e => { if(!isPlaying) e.currentTarget.style.background="#2a2a2a"; }}
                      onMouseLeave={e => { if(!isPlaying) e.currentTarget.style.background=isPlaying?"rgba(255,255,255,0.07)":"transparent"; }}>

                      {/* # / playing indicator */}
                      <div style={{ color:isPlaying?"#1DB954":"#b3b3b3", fontSize:13, paddingTop:4, textAlign:"center" }}>
                        {isPlaying ? (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="#1DB954">
                            <rect x="1" y="3" width="2" height="8" rx="1"><animate attributeName="height" values="8;3;8" dur="0.8s" repeatCount="indefinite"/><animate attributeName="y" values="3;5.5;3" dur="0.8s" repeatCount="indefinite"/></rect>
                            <rect x="5" y="1" width="2" height="12" rx="1"><animate attributeName="height" values="12;4;12" dur="0.7s" repeatCount="indefinite"/><animate attributeName="y" values="1;5;1" dur="0.7s" repeatCount="indefinite"/></rect>
                            <rect x="9" y="2" width="2" height="10" rx="1"><animate attributeName="height" values="10;6;10" dur="0.9s" repeatCount="indefinite"/><animate attributeName="y" values="2;4;2" dur="0.9s" repeatCount="indefinite"/></rect>
                          </svg>
                        ) : i+1}
                      </div>

                      {/* Title + AI line */}
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:40, height:40, borderRadius:2, background:`hsl(${(i*47+120)%360},40%,25%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:isPlaying?"#1DB954":"rgba(255,255,255,0.7)", flexShrink:0 }}>
                            {track.artist.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontSize:14, color:isPlaying?"#1DB954":"#fff", fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
                              {track.title}
                              {relStyle && (
                                <span title={`${relStyle.label} — Relevance Anchor`}
                                  style={{ color:relStyle.color, fontSize:13, flexShrink:0 }}>★</span>
                              )}
                              {wasSkipped && <span style={{ fontSize:10, color:"#888", fontWeight:400 }}>skipped</span>}
                            </div>
                            <div style={{ fontSize:12, color:"#b3b3b3" }}>{track.artist}</div>
                            {isNew && (
                              <div style={{ fontSize:11, color:"#1DB954", marginTop:3, display:"flex", alignItems:"flex-start", gap:4 }}>
                                <span style={{ background:"#1DB954", color:"#000", borderRadius:2, padding:"0 4px", fontSize:9, fontWeight:700, flexShrink:0, marginTop:1 }}>AI</span>
                                <span style={{ lineHeight:1.4 }}>{loading && !reasons[track.id] ? "Reasoning…" : reasons[track.id] || "Picked to fit your vibe but expand your taste."}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Save heart */}
                      <div style={{ paddingTop:8, textAlign:"center" }}>
                        <button onClick={(e) => toggleSave(track.id, e)}
                          title={isSaved ? "Saved" : "Save"}
                          style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:16, color:isSaved?"#1DB954":"#888", padding:0 }}>
                          {isSaved ? "♥" : "♡"}
                        </button>
                      </div>

                      {/* Add to playlist "+" with dropdown */}
                      <div style={{ paddingTop:8, textAlign:"center", position:"relative" }}>
                        <button onClick={(e) => toggleAddMenu(track.id, e)}
                          title="Add to playlist"
                          style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:16, color:"#888", padding:0, lineHeight:1 }}>
                          ＋
                        </button>
                        {showAddMenu === track.id && (
                          <div onClick={e => e.stopPropagation()}
                            style={{ position:"absolute", top:28, right:0, background:"#282828", border:"1px solid #3a3a3a", borderRadius:8, padding:8, zIndex:100, minWidth:200, boxShadow:"0 8px 24px rgba(0,0,0,0.6)" }}>
                            <div style={{ fontSize:11, color:"#888", padding:"4px 8px 8px", borderBottom:"1px solid #3a3a3a", marginBottom:6 }}>Add to playlist</div>
                            {userPlaylists.length === 0 && (
                              <div style={{ fontSize:12, color:"#888", padding:"4px 8px 8px" }}>No playlists yet — create one below</div>
                            )}
                            {userPlaylists.map(pl => (
                              <button key={pl.id}
                                onClick={(e) => addTrackToPlaylist(pl.id, track.id, e)}
                                style={{ display:"block", width:"100%", textAlign:"left", background:"transparent", border:"none", color: pl.tracks.includes(track.id) ? "#1DB954" : "#fff", fontSize:13, padding:"6px 8px", cursor:"pointer", borderRadius:4 }}>
                                {pl.tracks.includes(track.id) ? "✓ " : ""}{pl.name}
                              </button>
                            ))}
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(true); setAddToPlaylistTrackId(track.id); setShowAddMenu(null); }}
                              style={{ display:"block", width:"100%", textAlign:"left", background:"transparent", border:"none", color:"#1DB954", fontSize:13, padding:"6px 8px", cursor:"pointer", borderRadius:4, marginTop:4, borderTop:"1px solid #3a3a3a", paddingTop:10 }}>
                              ＋ Create new playlist
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Tag column — New / In rotation only */}
                      <div style={{ textAlign:"right", paddingTop:10 }}>
                        {isNew
                          ? <span style={{ border:"1px solid #1DB954", color:"#1DB954", borderRadius:500, padding:"2px 10px", fontSize:11, fontWeight:600 }}>New</span>
                          : <span style={{ color:"#b3b3b3", fontSize:12 }}>In rotation</span>}
                      </div>

                      {/* Year */}
                      <div style={{ color:"#b3b3b3", fontSize:13, paddingTop:12, textAlign:"right" }}>{track.year}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ textAlign:"center", color:"#4a4a4a", fontSize:11, marginTop:16 }}>
              Concept feature · not affiliated with Spotify · representative track pool · saves are session-only in this prototype
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width:280, background:"#121212", borderRadius:8, flexShrink:0, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:16 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>
              {currentTrack.title} <span style={{ color:"#b3b3b3", fontWeight:400 }}>· {currentTrack.artist}</span>
            </div>
            <div style={{ width:"100%", paddingBottom:"100%", background:"linear-gradient(135deg,#1a5c2e,#0d3018)", borderRadius:8, position:"relative", marginBottom:12 }}>
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:48 }}>◎</div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700 }}>{currentTrack.title}</div>
                <div style={{ fontSize:13, color:"#b3b3b3" }}>{currentTrack.artist}</div>
              </div>
              <button onClick={(e) => currentTrack.id && toggleSave(currentTrack.id, e)}
                style={{ background:"transparent", border:"none", color:currentTrack.id && saved.has(currentTrack.id) ? "#1DB954" : "#b3b3b3", fontSize:20, cursor:"pointer" }}>
                {currentTrack.id && saved.has(currentTrack.id) ? "♥" : "♡"}
              </button>
            </div>
          </div>
          <div style={{ padding:"0 16px 8px", fontSize:13, fontWeight:700 }}>About the artist</div>
          <div style={{ flex:1, overflowY:"auto", padding:"0 16px 16px" }}>
            <div style={{ background:"#282828", borderRadius:8, overflow:"hidden" }}>
              <div style={{ height:100, background:"linear-gradient(135deg,#8B6914,#c8a84b)", display:"flex", alignItems:"flex-end", padding:12 }}>
                <span style={{ fontWeight:700, fontSize:14 }}>{currentTrack.artist}</span>
              </div>
              <div style={{ padding:12 }}>
                <div style={{ fontSize:12, color:"#b3b3b3", marginBottom:6 }}>Indie / Alternative</div>
                <div style={{ fontSize:12, color:"#b3b3b3", lineHeight:1.5 }}>An artist in your Discovery Mix — added because they share your vibe.</div>
              </div>
            </div>
            <div style={{ marginTop:16, fontSize:13, fontWeight:700, marginBottom:8 }}>Next in mix</div>
            {mix.slice(1,4).map((t,i) => (
              <div key={t.id} onClick={() => setPlaying(t)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", cursor:"pointer", borderBottom:"1px solid #2a2a2a" }}>
                <div style={{ width:36, height:36, borderRadius:2, background:`hsl(${(i*80+200)%360},35%,25%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>
                  {t.artist.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.title}</div>
                  <div style={{ fontSize:12, color:"#b3b3b3" }}>{t.artist}</div>
                </div>
                {t.familiarity==="new" && <span style={{ fontSize:10, color:"#1DB954", border:"1px solid #1DB954", borderRadius:500, padding:"1px 6px", flexShrink:0 }}>New</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div style={{ height:72, background:"#181818", borderTop:"1px solid #282828", display:"flex", alignItems:"center", padding:"0 16px", gap:16, flexShrink:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, width:260, flexShrink:0 }}>
          <div style={{ width:48, height:48, borderRadius:4, background:"linear-gradient(135deg,#1a5c2e,#0d3018)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>◎</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{currentTrack.title}</div>
            <div style={{ fontSize:12, color:"#b3b3b3" }}>{currentTrack.artist}</div>
          </div>
          <button onClick={(e) => currentTrack.id && toggleSave(currentTrack.id, e)}
            style={{ background:"transparent", border:"none", color:currentTrack.id && saved.has(currentTrack.id) ? "#1DB954" : "#b3b3b3", fontSize:18, cursor:"pointer" }}>
            {currentTrack.id && saved.has(currentTrack.id) ? "♥" : "♡"}
          </button>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:14, cursor:"pointer" }}>⊞</button>
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:18, cursor:"pointer" }}>⇄</button>
            <button onClick={handlePrev} style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:22, cursor:"pointer" }}>⏮</button>
            <button onClick={() => setPlaying(p => p ? null : mix[0])}
              style={{ width:36, height:36, borderRadius:"50%", background:"#fff", border:"none", color:"#000", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              {playing ? "⏸" : "▶"}
            </button>
            <button onClick={handleSkip} title="Skip"
              style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:22, cursor:"pointer" }}>⏭</button>
            <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:18, cursor:"pointer" }}>↺</button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, width:"100%" }}>
            <span style={{ fontSize:11, color:"#b3b3b3", flexShrink:0 }}>1:24</span>
            <div style={{ flex:1, height:4, background:"#535353", borderRadius:2, cursor:"pointer" }}>
              <div style={{ width:"37%", height:"100%", background:"#fff", borderRadius:2 }}/>
            </div>
            <span style={{ fontSize:11, color:"#b3b3b3", flexShrink:0 }}>3:48</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, width:200, justifyContent:"flex-end", flexShrink:0 }}>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>🎤</button>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>☰</button>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>📱</button>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:14, color:"#b3b3b3" }}>🔊</span>
            <div style={{ width:80, height:4, background:"#535353", borderRadius:2, cursor:"pointer" }}>
              <div style={{ width:"70%", height:"100%", background:"#fff", borderRadius:2 }}/>
            </div>
          </div>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:14, cursor:"pointer" }}>⤢</button>
        </div>
      </div>

      {/* CREATE PLAYLIST MODAL */}
      {showPlaylistModal && (
        <div onClick={() => setShowPlaylistModal(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#282828", borderRadius:12, padding:28, width:340, boxShadow:"0 16px 48px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Create playlist</div>
            <div style={{ fontSize:13, color:"#b3b3b3", marginBottom:20 }}>Give your Discovery Mix playlist a name</div>
            <input
              autoFocus
              value={playlistName}
              onChange={e => setPlaylistName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createPlaylist()}
              placeholder="My Discovery Mix"
              style={{ width:"100%", padding:"12px 14px", borderRadius:6, background:"#3a3a3a", border:"1px solid #535353", color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:16 }}
            />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => { setShowPlaylistModal(false); setAddToPlaylistTrackId(null); }}
                style={{ background:"transparent", border:"1px solid #535353", color:"#fff", borderRadius:500, padding:"8px 20px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={() => {
                  const id = createPlaylist();
                  if (addToPlaylistTrackId) {
                    setUserPlaylists(prev => prev.map(pl =>
                      pl.id === id ? { ...pl, tracks:[addToPlaylistTrackId] } : pl
                    ));
                    setAddToPlaylistTrackId(null);
                  }
                }}
                style={{ background:"#1DB954", border:"none", color:"#000", borderRadius:500, padding:"8px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
