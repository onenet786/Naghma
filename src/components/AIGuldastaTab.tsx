import React, { useState } from "react";
import { Song } from "../types";
import { Sparkles, Play, Disc, Heart, Search, HelpCircle } from "lucide-react";

interface AIGuldastaTabProps {
  songs: Song[];
  favorites: string[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlay: (song: Song) => void;
  onToggleFavorite: (songId: string) => void;
}

interface CuratedGuldasta {
  title: string;
  vibeDescription: string;
  suggestions: Array<{ title: string; singer: string }>;
}

export default function AIGuldastaTab({
  songs,
  favorites,
  currentSong,
  isPlaying,
  onPlay,
  onToggleFavorite
}: AIGuldastaTabProps) {
  const [theme, setTheme] = useState("");
  const [curated, setCurated] = useState<CuratedGuldasta | null>(null);
  const [loading, setLoading] = useState(false);
  const [matchedSongs, setMatchedSongs] = useState<Song[]>([]);
  const [lookingUp, setLookingUp] = useState<Record<string, boolean>>({});

  // Preset quick ideas
  const PRESET_IDEAS = [
    "A lonely rainy night in Lahore with a cup of chai",
    "Reminiscing sweet nostalgic memories of PTV classic television",
    "Dholki wedding pre-festivities with rhythmic dance beats",
    "A crisp, solitary morning stroll listening to deep Sufi wisdom",
    "Feeling heavy vintage sadness, yearning for classic Ghazals"
  ];

  // Perform AI Curation
  const handleCurate = async (selectedTheme: string) => {
    if (!selectedTheme.trim()) return;
    setLoading(true);
    setCurated(null);
    setMatchedSongs([]);
    try {
      const response = await fetch(`/api/gemini/suggest?theme=${encodeURIComponent(selectedTheme)}`);
      const data = await response.json();
      setCurated(data);

      // Perform matching against our local catalog
      if (data.suggestions) {
        const matches: Song[] = [];
        data.suggestions.forEach((suggested: any) => {
          const sTitle = suggested.title.toLowerCase();
          const sSinger = suggested.singer.toLowerCase();
          
          // Look for direct overlaps in our local database
          const found = songs.find(s => 
            s.title.toLowerCase().includes(sTitle) || 
            sTitle.includes(s.title.toLowerCase()) ||
            (s.singerName.toLowerCase().includes(sSinger) && s.title.toLowerCase().includes(sTitle))
          );

          if (found) {
            matches.push(found);
          }
        });
        setMatchedSongs(matches);
      }
    } catch (e) {
      console.error("AI Curation failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // Perform interactive YouTube video ID lookup for suggestions not found in our pre-seeded local database
  const handleLookupAndPlay = async (suggestedTitle: string, suggestedSinger: string) => {
    const key = `${suggestedTitle}-${suggestedSinger}`;
    setLookingUp(prev => ({ ...prev, [key]: true }));
    try {
      // Query our backend search endpoint which automatically uses Gemini + Google Search Grounding to find YouTube IDs!
      const q = `${suggestedTitle} ${suggestedSinger}`;
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const results: Song[] = await response.json();

      if (results && results.length > 0) {
        // Find the best match
        const bestMatch = results[0];
        
        // Add to our matched song list locally
        setMatchedSongs(prev => {
          if (prev.some(s => s.youtubeId === bestMatch.youtubeId)) return prev;
          return [...prev, bestMatch];
        });

        // Trigger immediate play!
        onPlay(bestMatch);
      } else {
        alert(`We couldn't find a direct recording of "${suggestedTitle}" on YouTube. Please try another song!`);
      }
    } catch (e) {
      console.error("Dynamic lookup failed:", e);
    } finally {
      setLookingUp(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-8" id="ai-guldasta-tab-container">
      {/* 1. Header banner */}
      <div className="flex justify-between items-end border-b border-brand-gold/10 pb-2">
        <h2 className="font-display text-xl md:text-2xl font-semibold text-[#F5F0E8] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-gold" />
          <span>Guldasta-e-Zehn (AI Curation)</span>
        </h2>
        <span className="font-urdu text-brand-gold/60 text-sm select-none">گلدستہِ ذہن</span>
      </div>

      {/* 2. Form section */}
      <div className="bg-[#1E2E28]/50 border border-brand-gold/15 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-2 border border-brand-gold/5 pointer-events-none rounded-xl" />
        <div className="relative z-10 space-y-4">
          <p className="text-brand-cream/80 text-sm leading-relaxed">
            Unleash the full potential of **Aahang Curation Engine**. Describe what you are doing, feeling, or experiencing, and let Gemini construct a poetically tailored, Urdu-themed playlist with vintage matching tracks!
          </p>

          <div className="space-y-2">
            <label className="text-xs text-brand-gold font-mono block uppercase tracking-wider">
              ENTER YOUR VIBE OR EMOTIONAL THEME:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Sipping tea on a balcony in Islamabad, feeling sweet vintage romance..."
                className="flex-grow bg-[#162520] border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold focus:outline-none rounded-xl px-4 py-3 text-brand-cream text-sm placeholder-brand-cream/30"
                id="ai-theme-input"
              />
              <button
                onClick={() => handleCurate(theme)}
                disabled={loading || !theme.trim()}
                className="bg-brand-gold hover:bg-brand-cream text-brand-charcoal font-semibold text-xs md:text-sm px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
                id="ai-curate-submit-btn"
              >
                {loading ? (
                  <Disc className="w-4 h-4 animate-spin-slow" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Curate Guldasta</span>
              </button>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] text-brand-cream/40 font-mono uppercase block tracking-wider">
              OR CHOOSE A TIMELINES PRESET:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_IDEAS.map((idea) => (
                <button
                  key={idea}
                  onClick={() => {
                    setTheme(idea);
                    handleCurate(idea);
                  }}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg border border-brand-gold/10 hover:border-brand-gold/30 hover:bg-brand-emerald/10 text-brand-cream/80 hover:text-brand-cream text-[11px] transition-all bg-[#162520]/60"
                  id={`preset-idea-chip-${idea.substring(0, 10).replace(/\s+/g, "-")}`}
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Results section */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4" id="ai-curation-loading-display">
          <div className="relative w-16 h-16">
            <Disc className="w-full h-full text-brand-gold animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-gold animate-pulse" />
            </div>
          </div>
          <p className="text-brand-gold font-display italic text-sm animate-pulse text-center max-w-sm">
            Casting poetic nets into vintage archives... Drafting Urdu description...
          </p>
        </div>
      )}

      {curated && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="ai-curation-result-grid">
          
          {/* Poetic Guldasta Cover Panel */}
          <div className="lg:col-span-5 bg-[#12221C] border border-brand-gold/30 rounded-xl p-6 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute inset-2 border border-brand-gold/10 pointer-events-none rounded-lg" />
            <div className="absolute right-0 bottom-0 opacity-5 font-urdu text-[11rem] select-none pointer-events-none text-brand-gold">
              کلاسک
            </div>

            <div className="space-y-4 relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-brand-emerald border border-brand-gold/30 px-3 py-1 rounded-full text-[10px] text-brand-gold font-mono uppercase">
                <Sparkles className="w-3 h-3 animate-pulse" />
                <span>AI TAILORED GULDASTA • گلدستہ</span>
              </div>

              <div>
                <h3 className="font-display font-semibold text-[#F5F0E8] text-2xl tracking-tight leading-tight">
                  {curated.title}
                </h3>
                <p className="text-brand-cream/80 text-xs leading-relaxed border-l-2 border-brand-gold/40 pl-3 py-1 mt-4">
                  {curated.vibeDescription}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-brand-gold/15 mt-8 text-[10px] font-mono text-brand-gold uppercase tracking-wider relative z-10 flex justify-between">
              <span>Aahang AI engine</span>
              <span>Classic Urdu Archive</span>
            </div>
          </div>

          {/* Dynamic Interactive Curated Tracks Panel */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-end border-b border-brand-gold/15 pb-1.5">
              <h4 className="font-display text-sm font-semibold text-brand-gold">
                Cuaated Melodies
              </h4>
              <span className="text-[10px] text-brand-cream/40 font-mono">
                {curated.suggestions?.length || 0} SELECTIONS
              </span>
            </div>

            <div className="space-y-3">
              {curated.suggestions?.map((suggested, idx) => {
                const key = `${suggested.title}-${suggested.singer}`;
                const isLookingUp = lookingUp[key];

                // Check if this song is matched in our playables
                const playMatch = matchedSongs.find(s => 
                  s.title.toLowerCase().includes(suggested.title.toLowerCase()) ||
                  suggested.title.toLowerCase().includes(s.title.toLowerCase())
                );

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      playMatch && currentSong?.id === playMatch.id
                        ? "bg-brand-emerald/30 border-brand-gold shadow-md"
                        : "bg-[#1E2E28]/40 border-brand-gold/10 hover:border-brand-gold/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded bg-brand-charcoal border border-brand-gold/15 flex items-center justify-center text-brand-gold/70 text-xs font-mono font-bold">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-display font-bold text-brand-cream text-xs truncate">
                          {suggested.title}
                        </h5>
                        <p className="text-brand-gold/80 text-[10px] truncate">{suggested.singer}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {playMatch ? (
                        <>
                          <span className="text-[9px] bg-brand-emerald border border-brand-gold/20 text-brand-gold px-2 py-0.5 rounded font-mono hidden sm:inline">
                            MATCHED & PLAYABLE
                          </span>
                          <button
                            onClick={() => onPlay(playMatch)}
                            className="p-1.5 rounded-full bg-brand-gold text-brand-charcoal hover:scale-105 active:scale-95 transition-transform"
                            id={`ai-guldasta-play-${playMatch.id}`}
                          >
                            <Play className="w-3.5 h-3.5 fill-brand-charcoal ml-0.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleLookupAndPlay(suggested.title, suggested.singer)}
                          disabled={isLookingUp}
                          className="px-3 py-1.5 rounded-lg bg-brand-charcoal hover:bg-brand-emerald/20 border border-brand-gold/30 text-brand-gold hover:text-brand-cream text-[10px] font-mono transition-all flex items-center gap-1"
                          id={`ai-guldasta-lookup-${idx}`}
                        >
                          {isLookingUp ? (
                            <>
                              <Disc className="w-3 h-3 animate-spin" />
                              <span>Searching...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-3 h-3" />
                              <span>Dynamic Play</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
