import { useState, useEffect, useRef } from "react";
import { TRACKS, VIBES } from "./tracks.js";

const PLAYLISTS = [
  { id: "p1", name: "GYM SONGS 💪 (for girlies) 2026", sub: "Playlist · The music enthusiast", color: "#c8102e", emoji: "💪" },
  { id: "p2", name: "Liked Songs", sub: "Playlist · 122 songs", color: "#4B0082", emoji: "♥" },
  { id: "p3", name: "Haunted — Beyoncé", sub: "Playlist · Oona Katariina Kastari", color: "#8B0000", emoji: "👻" },
  { id: "p4", name: "Flirting songs", sub: "Playlist · Bunny 🐰", color: "#ff69b4", emoji: "💕" },
  { id: "p5", name: "Tale of karma", sub: "Playlist · Dj Ashwin shetty", color: "#ff6600", emoji: "🎵" },
  { id: "p6", name: "Wedding 2024", sub: "Playlist · amritansu", color: "#gold", emoji: "💒" },
  { id: "p7", name: "Discovery Mix ✦", sub: "Playlist · Made for purbasha", color: "#1DB954", emoji: "◎", isDiscovery: true },
];

const VIBE_LABELS = {
  indie: "Indie", ambient: "Ambient", techno: "Late-night", hyperpop: "Hyperpop", jazz: "Jazz", shoegaze: "Shoegaze"
};

function buildMix(activeVibes, dialPct) {
  const vibeSet = activeVibes.length ? activeVibes : ["indie"];
  const pool = TRACKS.filter(t => vibeSet.includes(t.vibe));
  const familiar = pool.filter(t => t.familiarity === "familiar");
  const newTracks = pool.filter(t => t.familiarity === "new");
  const total = 8;
  const newCount = Math.round(total * (dialPct / 100));
  const famCount = total - newCount;
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  const picked = [
    ...shuffle(familiar).slice(0, famCount),
    ...shuffle(newTracks).slice(0, newCount),
  ];
  return shuffle(picked);
}

const AI_REASONS = {
  indie: ["Hazy and melodic in your lane, a 2024 act under the radar.", "Keeps your warm lo-fi mood, pulling toward a quieter voice.", "Raw and melodic like your taste, rougher in a good way.", "Soft and introspective — shares your guitar-forward warmth.", "Sits in your corner of indie but with a new angle entirely."],
  ambient: ["Glacial and vast, a natural next step from your ambient picks.", "Textural and deep — close to what you love, further from the known.", "Verdant and warm, ambient without the coldness.", "Submerged and slow — the hidden side of the ambient world.", "Drifting in the same direction as your current picks."],
  techno: ["Hypnotic and driving, the deeper underground side of your taste.", "Dark and mechanical — what you'd hear after the main room.", "Stripped and relentless, a logical step deeper.", "Industrial edge, same energy, less mainstream.", "Late-night and propulsive — you'd find this at 3am."],
  shoegaze: ["Walls of reverb, new voice — same dream you're already in.", "Hazy and melodic, from a corner of shoegaze you haven't visited.", "Heavy and beautiful, what your usual picks are reaching toward.", "Echo-drenched and slow — shares your aesthetic DNA.", "Dreamy and distorted, the lesser-known side of the wave."],
  jazz: ["Organic and improvised, same soul as your picks but newer.", "Soulful and textural — the contemporary end of what you love.", "Sample-heavy and warm, where jazz meets your broader taste.", "Rhythmic and loose, a fresh take on the vibe you're in.", "Quiet and intricate — what plays between your other picks."],
  hyperpop: ["Glitchy and maximal — this is the underground version of your vibe.", "Chaotic in the right way, shares your energy without the mainstream tag.", "Playful and dense, a newer act in the same creative space.", "Maximalist and strange — what comes after your current picks.", "Underground and fast — the next wave of what you're already into."],
};

function getReason(track) {
  const pool = AI_REASONS[track.vibe] || AI_REASONS.indie;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function App() {
  const [activeVibes, setActiveVibes] = useState(["indie"]);
  const [dial, setDial] = useState(25);
  const [mix, setMix] = useState([]);
  const [reasons, setReasons] = useState({});
  const [playing, setPlaying] = useState(null);
  const [activePlaylist, setActivePlaylist] = useState("p7");
  const [dragging, setDragging] = useState(false);
  const sliderRef = useRef(null);

  useEffect(() => {
    const newMix = buildMix(activeVibes, dial);
    setMix(newMix);
    const r = {};
    newMix.filter(t => t.familiarity === "new").forEach(t => { r[t.id] = getReason(t); });
    setReasons(r);
    if (newMix.length) setPlaying(newMix[0]);
  }, []);

  function rebuild() {
    const newMix = buildMix(activeVibes, dial);
    setMix(newMix);
    const r = {};
    newMix.filter(t => t.familiarity === "new").forEach(t => { r[t.id] = getReason(t); });
    setReasons(r);
    if (newMix.length) setPlaying(newMix[0]);
  }

  function toggleVibe(v) {
    setActiveVibes(prev => prev.includes(v) ? (prev.length > 1 ? prev.filter(x => x !== v) : prev) : [...prev, v]);
  }

  const newCount = mix.filter(t => t.familiarity === "new").length;
  const dialLabel = dial <= 15 ? "Comfort zone" : dial <= 35 ? "Mostly familiar" : dial <= 60 ? "Adventurous" : "Maximum discovery";

  function handleSliderClick(e) {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    setDial(pct);
  }

  const currentTrack = playing || mix[0] || { title: "Discovery Mix", artist: "purbasha" };
  const playlistColor = { background: "linear-gradient(135deg, #1a5c2e 0%, #0d3018 50%, #000 100%)" };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#000", color:"#fff", fontFamily:"'Circular Std', 'Helvetica Neue', Arial, sans-serif", overflow:"hidden" }}>
      
      {/* TOP BAR */}
      <div style={{ height:64, background:"#000", display:"flex", alignItems:"center", padding:"0 16px", gap:8, flexShrink:0, zIndex:10 }}>
        {/* Spotify logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:8 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>

        {/* Nav arrows */}
        <button style={{ background:"rgba(0,0,0,0.7)", border:"none", color:"#fff", width:32, height:32, borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>‹</button>
        <button style={{ background:"rgba(0,0,0,0.7)", border:"none", color:"#b3b3b3", width:32, height:32, borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>›</button>

        {/* Search bar */}
        <div style={{ flex:1, maxWidth:360, position:"relative", margin:"0 auto" }}>
          <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#000", fontSize:14 }}>🔍</div>
          <input
            placeholder="What do you want to play?"
            style={{ width:"100%", padding:"10px 16px 10px 36px", borderRadius:500, background:"#fff", border:"none", fontSize:14, color:"#000", boxSizing:"border-box", outline:"none" }}
          />
          <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#000", fontSize:16 }}>⊞</div>
        </div>

        {/* Right controls */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
          <button style={{ background:"#fff", color:"#000", border:"none", borderRadius:500, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Explore Premium</button>
          <button style={{ background:"transparent", color:"#fff", border:"1px solid #fff", borderRadius:500, padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:12 }}>⬇</span> Install App
          </button>
          <div style={{ width:32, height:32, background:"transparent", border:"none", color:"#b3b3b3", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>🔔</div>
          <div style={{ width:32, height:32, background:"transparent", border:"none", color:"#b3b3b3", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>👥</div>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#532683", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, cursor:"pointer" }}>P</div>
        </div>
      </div>

      {/* MAIN 3-COLUMN LAYOUT */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", gap:8, padding:"0 8px 8px" }}>

        {/* LEFT PANEL — Your Library */}
        <div style={{ width:280, background:"#121212", borderRadius:8, display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>
          <div style={{ padding:"16px 16px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontWeight:700, fontSize:15 }}>
              <span>☰</span> Your Library
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:20, cursor:"pointer", padding:4 }}>+</button>
              <span style={{ color:"#b3b3b3", fontSize:13, padding:4, cursor:"pointer" }}>Create</span>
              <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer", padding:4 }}>⤢</button>
            </div>
          </div>
          
          {/* Filter chips */}
          <div style={{ padding:"0 16px 8px", display:"flex", gap:6 }}>
            {["Playlists","Artists","Albums"].map(f => (
              <button key={f} style={{ background:f==="Playlists"?"#fff":"#2a2a2a", color:f==="Playlists"?"#000":"#fff", border:"none", borderRadius:500, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{f}</button>
            ))}
          </div>

          {/* Search in library */}
          <div style={{ padding:"0 16px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>🔍</button>
            <div style={{ color:"#b3b3b3", fontSize:12, display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>Recents ☰</div>
          </div>

          {/* Playlist list */}
          <div style={{ flex:1, overflowY:"auto", padding:"0 8px" }}>
            {PLAYLISTS.map(pl => (
              <div
                key={pl.id}
                onClick={() => setActivePlaylist(pl.id)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"8px", borderRadius:4, cursor:"pointer", background: activePlaylist===pl.id ? "#2a2a2a" : "transparent" }}
              >
                <div style={{ width:48, height:48, borderRadius:pl.id==="p2"?4:4, background: pl.isDiscovery?"#1DB954":pl.color||"#333", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, overflow:"hidden" }}>
                  {pl.isDiscovery ? <span style={{ fontSize:22, filter:"brightness(0) invert(1)" }}>◎</span> : <span>{pl.emoji}</span>}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:500, color: pl.isDiscovery?"#1DB954":"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pl.name}</div>
                  <div style={{ fontSize:12, color:"#b3b3b3", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pl.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — Main content */}
        <div style={{ flex:1, background:"#121212", borderRadius:8, overflowY:"auto", position:"relative" }}>
          {/* Hero gradient */}
          <div style={{ background:"linear-gradient(180deg, #1a5c2e 0%, #0d3018 40%, #121212 100%)", padding:"24px 24px 0", minHeight:200 }}>
            {/* Quick access */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginBottom:24 }}>
              {["GYM SONGS 💪 (for girlies) 2026","Liked Songs","The Summer I Turned Pretty: Official Playlist","Shree Hanuman Chalisa (Hanuman Ashtak)","Slow Coffee, Slow Heart","Ep. 17: Ritika Saraf"].map((name, i) => (
                <div key={i} style={{ background:"rgba(255,255,255,0.1)", borderRadius:4, display:"flex", alignItems:"center", gap:8, padding:"4px 12px 4px 4px", cursor:"pointer", transition:"background 0.2s" }}>
                  <div style={{ width:48, height:48, background: i===0?"#c8102e":i===1?"#4B0082":i===2?"#8B4513":i===3?"#ff6600":i===4?"#006400":"#4169E1", borderRadius:4, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                    {["💪","♥","🌸","🙏","☕","🎙️"][i]}
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, lineHeight:1.2 }}>{name}</span>
                </div>
              ))}
            </div>

            {/* Getting started / Made for */}
            <div style={{ display:"flex", gap:24, marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Getting started</h2>
                  <div style={{ display:"flex", gap:8 }}>
                    <button style={{ background:"rgba(0,0,0,0.5)", border:"none", color:"#fff", width:28, height:28, borderRadius:"50%", cursor:"pointer" }}>‹</button>
                    <button style={{ background:"rgba(0,0,0,0.5)", border:"none", color:"#fff", width:28, height:28, borderRadius:"50%", cursor:"pointer" }}>›</button>
                  </div>
                </div>
                <div style={{ background:"linear-gradient(135deg, #c8a84b 0%, #8B6914 100%)", borderRadius:8, padding:16, display:"flex", gap:12, alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:20, fontWeight:900, marginBottom:4 }}>1. Start playing</div>
                    <div style={{ fontSize:13, opacity:0.9, marginBottom:12 }}>Search, browse, and play your favorite artists and creators.</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button style={{ background:"#1DB954", color:"#000", border:"none", borderRadius:500, padding:"8px 20px", fontWeight:700, fontSize:14, cursor:"pointer" }}>Search</button>
                      <button style={{ background:"transparent", color:"#c8a84b", border:"none", fontWeight:600, fontSize:13, cursor:"pointer" }}>Show more tips</button>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div><div style={{ fontSize:12, color:"#b3b3b3", marginBottom:2 }}>Made For</div><h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>purbasha</h2></div>
                  <span style={{ color:"#1DB954", fontSize:13, fontWeight:600, cursor:"pointer" }}>Show all</span>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  {[{n:"Daily Mix 01",a:"Arijit Singh, Himesh...",c:"#ff6600"},{n:"Daily Mix 02",a:"Olivia Rodrigo, Katy...",c:"#9B59B6"}].map((m,i)=>(
                    <div key={i} style={{ flex:1, background:"#2a2a2a", borderRadius:8, padding:12, cursor:"pointer" }}>
                      <div style={{ width:"100%", paddingBottom:"100%", background:`linear-gradient(135deg, ${m.c}, #000)`, borderRadius:4, position:"relative", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
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

          {/* DISCOVERY MIX — The Feature */}
          <div style={{ padding:"0 24px 24px" }}>
            <div style={{ marginBottom:8, color:"#b3b3b3", fontSize:13, fontWeight:600, letterSpacing:1 }}>ALBUMS FEATURING SONGS YOU LIKE</div>
            
            {/* Discovery Dial Feature Card */}
            <div style={{ background:"#181818", borderRadius:8, marginBottom:24, overflow:"hidden" }}>
              {/* Playlist header */}
              <div style={{ background:"linear-gradient(135deg, #1a5c2e 0%, #0d3018 100%)", padding:"20px 20px 0" }}>
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls row */}
              <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
                <button
                  onClick={() => playing ? setPlaying(null) : setPlaying(mix[0])}
                  style={{ width:56, height:56, borderRadius:"50%", background:"#1DB954", border:"none", color:"#000", fontSize:22, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}
                >
                  {playing ? "⏸" : "▶"}
                </button>
                <div style={{ color:"#b3b3b3", fontSize:20, cursor:"pointer" }}>♡</div>
                <div style={{ color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>⋯</div>
              </div>

              {/* Discovery Dial */}
              <div style={{ margin:"0 20px 16px", background:"#282828", borderRadius:8, padding:"16px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ color:"#1DB954", fontSize:12, fontWeight:700, letterSpacing:1 }}>✦ DISCOVERY DIAL</span>
                  </div>
                  <span style={{ color:"#b3b3b3", fontSize:13 }}>{dialLabel} · <span style={{ color:"#fff", fontWeight:600 }}>{dial}% new</span></span>
                </div>

                {/* Slider */}
                <div
                  ref={sliderRef}
                  onClick={handleSliderClick}
                  style={{ position:"relative", height:4, background:"#535353", borderRadius:2, cursor:"pointer", marginBottom:8 }}
                >
                  <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${dial}%`, background:"#1DB954", borderRadius:2 }} />
                  <div style={{ position:"absolute", top:"50%", left:`${dial}%`, transform:"translate(-50%,-50%)", width:16, height:16, borderRadius:"50%", background:"#fff", boxShadow:"0 2px 8px rgba(0,0,0,0.5)" }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#b3b3b3" }}>
                  <span>Comfort</span>
                  <span>Maximum discovery</span>
                </div>

                <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
                  {VIBES.map(v => (
                    <button
                      key={v.id}
                      onClick={() => toggleVibe(v.id)}
                      style={{ padding:"6px 14px", borderRadius:500, border: activeVibes.includes(v.id)?"2px solid #1DB954":"1px solid #535353", background: activeVibes.includes(v.id)?"rgba(29,185,84,0.15)":"transparent", color: activeVibes.includes(v.id)?"#1DB954":"#b3b3b3", fontSize:12, fontWeight:600, cursor:"pointer" }}
                    >
                      {VIBE_LABELS[v.id]}
                    </button>
                  ))}
                  <button
                    onClick={rebuild}
                    style={{ marginLeft:"auto", padding:"6px 20px", borderRadius:500, background:"#1DB954", border:"none", color:"#000", fontSize:13, fontWeight:700, cursor:"pointer" }}
                  >
                    ▶ Build mix
                  </button>
                </div>
              </div>

              {/* Track list */}
              <div style={{ padding:"0 20px 20px" }}>
                <div style={{ display:"grid", gridTemplateColumns:"24px 1fr auto auto", gap:"0 16px", padding:"8px 0", borderBottom:"1px solid #2a2a2a", marginBottom:4 }}>
                  <div style={{ color:"#b3b3b3", fontSize:12 }}>#</div>
                  <div style={{ color:"#b3b3b3", fontSize:12 }}>TITLE</div>
                  <div style={{ color:"#b3b3b3", fontSize:12, textAlign:"right" }}>TAG</div>
                  <div style={{ color:"#b3b3b3", fontSize:12, textAlign:"right" }}>YEAR</div>
                </div>
                {mix.map((track, i) => {
                  const isPlaying = playing?.id === track.id;
                  const isNew = track.familiarity === "new";
                  return (
                    <div
                      key={track.id}
                      onClick={() => setPlaying(track)}
                      style={{ display:"grid", gridTemplateColumns:"24px 1fr auto auto", gap:"0 16px", padding:"10px 8px", borderRadius:4, cursor:"pointer", background: isPlaying?"rgba(255,255,255,0.07)":"transparent", alignItems:"start" }}
                      onMouseEnter={e => { if(!isPlaying) e.currentTarget.style.background="#2a2a2a"; }}
                      onMouseLeave={e => { if(!isPlaying) e.currentTarget.style.background="transparent"; }}
                    >
                      <div style={{ color: isPlaying?"#1DB954":"#b3b3b3", fontSize:14, paddingTop:2, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {isPlaying ? (
                          <span style={{ fontSize:10 }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="#1DB954">
                              <rect x="1" y="3" width="2" height="8" rx="1"><animate attributeName="height" values="8;3;8" dur="0.8s" repeatCount="indefinite"/><animate attributeName="y" values="3;5.5;3" dur="0.8s" repeatCount="indefinite"/></rect>
                              <rect x="5" y="1" width="2" height="12" rx="1"><animate attributeName="height" values="12;4;12" dur="0.7s" repeatCount="indefinite"/><animate attributeName="y" values="1;5;1" dur="0.7s" repeatCount="indefinite"/></rect>
                              <rect x="9" y="2" width="2" height="10" rx="1"><animate attributeName="height" values="10;6;10" dur="0.9s" repeatCount="indefinite"/><animate attributeName="y" values="2;4;2" dur="0.9s" repeatCount="indefinite"/></rect>
                            </svg>
                          </span>
                        ) : i + 1}
                      </div>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:40, height:40, borderRadius:2, background:`hsl(${(i*47+120)%360},40%,25%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:isPlaying?"#1DB954":"rgba(255,255,255,0.7)", flexShrink:0 }}>
                            {track.artist.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize:14, color: isPlaying?"#1DB954":"#fff", fontWeight:500 }}>{track.title}</div>
                            <div style={{ fontSize:12, color:"#b3b3b3" }}>{track.artist}</div>
                            {isNew && reasons[track.id] && (
                              <div style={{ fontSize:11, color:"#1DB954", marginTop:3, display:"flex", alignItems:"center", gap:4 }}>
                                <span style={{ background:"#1DB954", color:"#000", borderRadius:2, padding:"0px 4px", fontSize:10, fontWeight:700 }}>AI</span>
                                {reasons[track.id]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", paddingTop:10 }}>
                        {isNew ? (
                          <span style={{ background:"transparent", border:"1px solid #1DB954", color:"#1DB954", borderRadius:500, padding:"2px 10px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>New</span>
                        ) : (
                          <span style={{ color:"#b3b3b3", fontSize:12 }}>In rotation</span>
                        )}
                      </div>
                      <div style={{ color:"#b3b3b3", fontSize:13, paddingTop:12, textAlign:"right" }}>{track.year}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — Now playing context */}
        <div style={{ width:280, background:"#121212", borderRadius:8, flexShrink:0, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:16 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>
              {currentTrack.title} <span style={{ color:"#b3b3b3", fontWeight:400 }}>· {currentTrack.artist}</span>
            </div>
            <div style={{ width:"100%", paddingBottom:"100%", background:`linear-gradient(135deg, #1a5c2e, #0d3018)`, borderRadius:8, position:"relative", marginBottom:12 }}>
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:48 }}>◎</div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700 }}>{currentTrack.title}</div>
                <div style={{ fontSize:13, color:"#b3b3b3" }}>{currentTrack.artist}</div>
              </div>
              <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:20, cursor:"pointer" }}>♡</button>
            </div>
          </div>

          <div style={{ padding:"0 16px", fontSize:13, fontWeight:700, color:"#fff", marginBottom:8 }}>About the artist</div>
          <div style={{ flex:1, overflowY:"auto", padding:"0 16px 16px" }}>
            <div style={{ background:"#282828", borderRadius:8, overflow:"hidden" }}>
              <div style={{ height:100, background:"linear-gradient(135deg,#8B6914,#c8a84b)", display:"flex", alignItems:"flex-end", padding:12 }}>
                <span style={{ fontWeight:700, fontSize:14 }}>{currentTrack.artist}</span>
              </div>
              <div style={{ padding:12 }}>
                <div style={{ fontSize:12, color:"#b3b3b3", marginBottom:8 }}>Indie / Alternative</div>
                <div style={{ fontSize:12, color:"#b3b3b3", lineHeight:1.5 }}>
                  An artist in your Discovery Mix — added because they share your vibe.
                </div>
              </div>
            </div>

            <div style={{ marginTop:16, fontSize:13, fontWeight:700, marginBottom:8 }}>Next in mix</div>
            {mix.slice(1, 4).map((t, i) => (
              <div key={t.id} onClick={() => setPlaying(t)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", cursor:"pointer", borderBottom:"1px solid #2a2a2a" }}>
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

      {/* BOTTOM NOW-PLAYING BAR */}
      <div style={{ height:72, background:"#181818", borderTop:"1px solid #282828", display:"flex", alignItems:"center", padding:"0 16px", gap:16, flexShrink:0, zIndex:10 }}>
        {/* Current track */}
        <div style={{ display:"flex", alignItems:"center", gap:12, width:280, flexShrink:0 }}>
          <div style={{ width:48, height:48, borderRadius:4, background:"linear-gradient(135deg,#1a5c2e,#0d3018)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>◎</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{currentTrack.title}</div>
            <div style={{ fontSize:12, color:"#b3b3b3", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{currentTrack.artist}</div>
          </div>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:18, cursor:"pointer", flexShrink:0 }}>♡</button>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:14, cursor:"pointer", flexShrink:0 }}>⊞</button>
        </div>

        {/* Playback controls */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:18, cursor:"pointer" }}>⇄</button>
            <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:22, cursor:"pointer" }}>⏮</button>
            <button
              onClick={() => setPlaying(p => p ? null : mix[0])}
              style={{ width:36, height:36, borderRadius:"50%", background:"#fff", border:"none", color:"#000", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
            >
              {playing ? "⏸" : "▶"}
            </button>
            <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:22, cursor:"pointer" }}>⏭</button>
            <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:18, cursor:"pointer" }}>↺</button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, width:"100%" }}>
            <span style={{ fontSize:11, color:"#b3b3b3", flexShrink:0 }}>1:24</span>
            <div style={{ flex:1, height:4, background:"#535353", borderRadius:2, position:"relative", cursor:"pointer" }}>
              <div style={{ width:"37%", height:"100%", background:"#fff", borderRadius:2 }} />
            </div>
            <span style={{ fontSize:11, color:"#b3b3b3", flexShrink:0 }}>3:48</span>
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display:"flex", alignItems:"center", gap:12, width:220, justifyContent:"flex-end", flexShrink:0 }}>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>🎤</button>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>☰</button>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>⧉</button>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:16, cursor:"pointer" }}>📱</button>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:14, color:"#b3b3b3" }}>🔊</span>
            <div style={{ width:80, height:4, background:"#535353", borderRadius:2, cursor:"pointer" }}>
              <div style={{ width:"70%", height:"100%", background:"#fff", borderRadius:2 }} />
            </div>
          </div>
          <button style={{ background:"transparent", border:"none", color:"#b3b3b3", fontSize:14, cursor:"pointer" }}>⤢</button>
        </div>
      </div>
    </div>
  );
}
