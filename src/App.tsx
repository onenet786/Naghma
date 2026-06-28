import React, { useState, useEffect } from "react";
import { Song, Collection } from "./types";
import YTAudioPlayer from "./components/YTAudioPlayer";
import ExploreTab from "./components/ExploreTab";
import SearchTab from "./components/SearchTab";
import CollectionsTab from "./components/CollectionsTab";
import PlaylistsTab from "./components/PlaylistsTab";
import AIGuldastaTab from "./components/AIGuldastaTab";
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Sparkles, 
  Disc, Music, Heart, Eye, EyeOff, LayoutDashboard, Search, ListMusic, 
  Library, Maximize2, Minimize2, Radio, Shuffle, RotateCcw, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Navigation / Tabs State
  const [activeTab, setActiveTab] = useState<"explore" | "search" | "collections" | "playlists" | "guldasta">("guldasta");
  
  // Custom states for filter sharing
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDecade, setSearchDecade] = useState("");
  const [searchGenre, setSearchGenre] = useState("");

  // Global Player States
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentQueue, setCurrentQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // Playback Timing states (synced from YouTube player)
  const [playerTiming, setPlayerTiming] = useState({
    currentTime: 0,
    duration: 180,
    isBuffering: false
  });

  // Database lists fetched from server
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Player expanded view toggle (Vinyl sleeve fullview)
  const [isExpanded, setIsExpanded] = useState(false);

  // 1. Fetch catalog data from backend API
  const fetchCatalog = async () => {
    try {
      setErrorMsg(null);
      const [songsRes, collectionsRes, favRes] = await Promise.all([
        fetch("/api/songs"),
        fetch("/api/collections"),
        fetch("/api/favorites")
      ]);
      if (!songsRes.ok || !collectionsRes.ok || !favRes.ok) {
        throw new Error("One or more catalog requests failed");
      }

      const [songsData, collectionsData, favData] = await Promise.all([
        songsRes.json(),
        collectionsRes.json(),
        favRes.json()
      ]);
      setAllSongs(songsData);
      setCollections(collectionsData);
      setFavorites(favData.map((s: Song) => s.id));
    } catch (e) {
      console.error("Failed to connect to fullstack server:", e);
      setErrorMsg("Failed to connect to Naghma full-stack server. Fallback to offline pre-seeded database.");
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // 2. Play controls
  const handlePlaySong = async (song: Song) => {
    // Set song
    setCurrentSong(song);
    setIsPlaying(true);

    // Sync queue based on current tab context if queue is empty
    if (currentQueue.length === 0 || !currentQueue.some(q => q.id === song.id)) {
      setCurrentQueue(allSongs);
    }

    // Report play to server for statistics tracking
    try {
      const response = await fetch(`/api/songs/${song.id}/play`, { method: "POST" });
      if (!response.ok) throw new Error("Play tracking request failed");
      const { playCount } = await response.json();
      setAllSongs(current => current.map(item =>
        item.id === song.id ? { ...item, playCount } : item
      ));
    } catch (e) {
      console.error("Failed to report play statistic:", e);
    }
  };

  const handleTogglePlay = () => {
    if (!currentSong && allSongs.length > 0) {
      handlePlaySong(allSongs[0]);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNextTrack = () => {
    if (currentQueue.length === 0) return;
    const currentIndex = currentQueue.findIndex(s => s.id === currentSong?.id);
    let nextIndex = 0;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * currentQueue.length);
    } else {
      nextIndex = (currentIndex + 1) % currentQueue.length;
    }

    handlePlaySong(currentQueue[nextIndex]);
  };

  const handlePrevTrack = () => {
    if (currentQueue.length === 0) return;
    const currentIndex = currentQueue.findIndex(s => s.id === currentSong?.id);
    let prevIndex = currentIndex - 1;

    if (prevIndex < 0) {
      prevIndex = currentQueue.length - 1;
    }

    handlePlaySong(currentQueue[prevIndex]);
  };

  const handleToggleFavorite = async (songId: string) => {
    try {
      const response = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId })
      });
      if (!response.ok) throw new Error("Favorite update failed");
      const { isFavorite } = await response.json();
      setFavorites(current => isFavorite
        ? (current.includes(songId) ? current : [...current, songId])
        : current.filter(id => id !== songId)
      );
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
    }
  };

  // 3. Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Decades navigation shortcut
  const handleSelectDecade = (dec: string) => {
    setSearchDecade(dec);
    setSearchGenre("");
    setSearchQuery("");
    setActiveTab("search");
  };

  // Genre navigation shortcut
  const handleSelectGenre = (gen: string) => {
    setSearchGenre(gen);
    setSearchDecade("");
    setSearchQuery("");
    setActiveTab("search");
  };

  // Singer navigation shortcut
  const handleSelectSinger = (singerName: string) => {
    setSearchQuery(singerName);
    setSearchDecade("");
    setSearchGenre("");
    setActiveTab("search");
  };

  // Calculate percentage of track completion
  const progressPercent = playerTiming.duration > 0
    ? (playerTiming.currentTime / playerTiming.duration) * 100
    : 0;

  return (
    <div className="min-h-screen bg-[#14231E] text-brand-cream font-sans pb-32 selection:bg-brand-gold selection:text-brand-charcoal" id="main-app-viewport">
      
      {/* Background paper texture pattern overlay */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay bg-[radial-gradient(#C9A84C_1px,transparent_1px)] [background-size:16px_16px] z-0" />

      {/* Floating playback warning banner */}
      <AnimatePresence>
        {playbackError && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4"
          >
            <div className="bg-[#1C1212]/95 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 animate-pulse" />
              <div className="flex-grow min-w-0">
                <p className="text-xs font-semibold text-red-400">Archive Link Unavailable</p>
                <p className="text-[11px] text-red-200/80 truncate mt-0.5">{playbackError}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header className="sticky top-0 bg-[#12221C]/90 backdrop-blur-md border-b border-brand-gold/15 z-40 px-4 py-3 md:px-8 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-emerald border-2 border-brand-gold flex items-center justify-center text-brand-gold shadow-lg animate-spin-slow">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-bold text-xl md:text-2xl text-brand-cream uppercase tracking-wider">NAGHMA</span>
              <span className="font-urdu text-brand-gold font-normal text-sm tracking-normal leading-none select-none">نغمہ</span>
            </div>
            <p className="text-[10px] text-brand-gold/80 font-mono tracking-widest uppercase">Vintage Pakistani Soundscape</p>
          </div>
        </div>

        {/* Global connection notice */}
        {errorMsg ? (
          <div className="hidden md:flex items-center gap-2 bg-red-950/40 border border-red-500/30 text-red-400 px-3 py-1 rounded-full text-[10px] font-mono">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>OFFLINE LOCAL SEEDING</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 bg-brand-emerald/40 border border-brand-gold/30 text-brand-gold px-3.5 py-1 rounded-full text-[10px] font-mono shadow-inner uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Aahang Live Engine Active</span>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8 relative z-10 flex flex-col md:flex-row gap-8">
        
        {/* Left Side Navigation (Desktop Rail / Bottom bar on mobile) */}
        <nav className="w-full md:w-64 flex-shrink-0 flex md:flex-col gap-2 bg-[#12221C] border border-brand-gold/10 p-2 md:p-4 rounded-2xl md:h-fit shadow-2xl relative">
          {/* Decorative Corner Ornaments */}
          <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-brand-gold/20 pointer-events-none rounded-tl hidden md:block" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r border-b border-brand-gold/20 pointer-events-none rounded-br hidden md:block" />

          <span className="text-[9px] font-mono text-brand-gold/40 uppercase tracking-widest px-3 mb-2 hidden md:block">MAIN MENU</span>
          
          <button
            onClick={() => setActiveTab("explore")}
            className={`flex-grow md:flex-grow-0 flex items-center justify-center md:justify-start gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "explore"
                ? "bg-brand-emerald border border-brand-gold text-brand-gold shadow-lg"
                : "text-brand-cream/75 hover:bg-brand-emerald/10 hover:text-brand-gold"
            }`}
            id="nav-tab-explore"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:inline">Markaz-e-Khayaal (Explore)</span>
          </button>

          <button
            onClick={() => {
              setSearchQuery("");
              setSearchDecade("");
              setSearchGenre("");
              setActiveTab("search");
            }}
            className={`flex-grow md:flex-grow-0 flex items-center justify-center md:justify-start gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "search"
                ? "bg-brand-emerald border border-brand-gold text-brand-gold shadow-lg"
                : "text-brand-cream/75 hover:bg-brand-emerald/10 hover:text-brand-gold"
            }`}
            id="nav-tab-search"
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">Daryaft (Search Catalog)</span>
          </button>

          <button
            onClick={() => setActiveTab("collections")}
            className={`flex-grow md:flex-grow-0 flex items-center justify-center md:justify-start gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "collections"
                ? "bg-brand-emerald border border-brand-gold text-brand-gold shadow-lg"
                : "text-brand-cream/75 hover:bg-brand-emerald/10 hover:text-brand-gold"
            }`}
            id="nav-tab-collections"
          >
            <ListMusic className="w-4 h-4" />
            <span className="hidden md:inline">Saughaat (Curated Packs)</span>
          </button>

          <button
            onClick={() => setActiveTab("playlists")}
            className={`flex-grow md:flex-grow-0 flex items-center justify-center md:justify-start gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "playlists"
                ? "bg-brand-emerald border border-brand-gold text-brand-gold shadow-lg"
                : "text-brand-cream/75 hover:bg-brand-emerald/10 hover:text-brand-gold"
            }`}
            id="nav-tab-playlists"
          >
            <Library className="w-4 h-4" />
            <span className="hidden md:inline">Guldasta (My Playlists)</span>
          </button>

          <div className="w-full h-px bg-brand-gold/10 my-2 hidden md:block" />
          <span className="text-[9px] font-mono text-brand-gold/40 uppercase tracking-widest px-3 mb-2 hidden md:block">AI EXPERIENCES</span>

          <button
            onClick={() => setActiveTab("guldasta")}
            className={`flex-grow md:flex-grow-0 flex items-center justify-center md:justify-start gap-3 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all ${
              activeTab === "guldasta"
                ? "bg-gradient-to-r from-brand-emerald to-[#133529] border border-brand-gold text-brand-gold shadow-lg shadow-brand-emerald/40 animate-pulse"
                : "text-brand-cream/75 hover:bg-brand-emerald/10 hover:text-brand-gold"
            }`}
            id="nav-tab-guldasta"
          >
            <Sparkles className="w-4 h-4 text-brand-gold" />
            <span className="hidden md:inline">AI Curation Guldasta</span>
          </button>
        </nav>

        {/* Content Panel Area */}
        <div className="flex-grow min-w-0" id="main-content-window-tab-holder">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "explore" && (
                <ExploreTab
                  songs={allSongs}
                  collections={collections}
                  favorites={favorites}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlay={handlePlaySong}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectDecade={handleSelectDecade}
                  onSelectGenre={handleSelectGenre}
                  onSelectSinger={handleSelectSinger}
                />
              )}
              {activeTab === "search" && (
                <SearchTab
                  favorites={favorites}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlay={handlePlaySong}
                  onToggleFavorite={handleToggleFavorite}
                  initialSearchQuery={searchQuery}
                  initialDecade={searchDecade}
                  initialGenre={searchGenre}
                />
              )}
              {activeTab === "collections" && (
                <CollectionsTab
                  collections={collections}
                  favorites={favorites}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlay={handlePlaySong}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
              {activeTab === "playlists" && (
                <PlaylistsTab
                  songs={allSongs}
                  favorites={favorites}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlay={handlePlaySong}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
              {activeTab === "guldasta" && (
                <AIGuldastaTab
                  songs={allSongs}
                  favorites={favorites}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlay={handlePlaySong}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Hidden YouTube Iframe Player Frame */}
      <YTAudioPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        playbackRate={1}
        onStateChange={(state) => {
          setPlayerTiming(prev => ({
            ...prev,
            currentTime: state.currentTime,
            duration: state.duration > 0 ? state.duration : prev.duration,
            isBuffering: state.isBuffering
          }));
          setIsPlaying(state.isPlaying);
        }}
        onEnded={handleNextTrack}
        onError={(msg) => {
          setPlaybackError(`"${currentSong?.title || "Song"}" could not be played: ${msg}`);
          setTimeout(() => {
            setPlaybackError(null);
          }, 6000);
        }}
        showVideo={showVideo}
      />

      {/* Floating Retro TV Toggle Icon (If showing video mode, floating video overlay is visible) */}
      {currentSong && showVideo && (
        <div className="fixed bottom-36 right-6 md:right-8 z-30 flex flex-col items-end gap-2 animate-bounce-slow">
          <div className="bg-[#12221C] border border-brand-gold p-3 rounded-2xl shadow-2xl relative w-72">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-mono text-brand-gold">RETRO TV PORTRAIT FEED</span>
              <button onClick={() => setShowVideo(false)} className="text-brand-cream/50 hover:text-brand-cream">
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="aspect-video bg-black rounded overflow-hidden">
              {/* YouTube video will render inside the YTAudioPlayer layout */}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Audio Player Bar */}
      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#12221C]/95 backdrop-blur-md border-t border-brand-gold/20 shadow-2xl z-50 px-4 py-4 md:px-8" id="persistent-player-bottom-bar">
          
          {/* Seek progress slider */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-brand-charcoal cursor-pointer group">
            <div 
              className="h-full bg-gradient-to-r from-brand-gold to-brand-cream relative transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-cream border border-brand-gold scale-0 group-hover:scale-100 transition-transform duration-100" />
            </div>
          </div>

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Song Cover & Info (Clickable to expand to Full Vinyl mode) */}
            <div className="flex items-center gap-4 w-full md:w-1/3 min-w-0">
              <button 
                onClick={() => setIsExpanded(true)}
                className="relative w-12 h-12 rounded-lg overflow-hidden border border-brand-gold/20 flex-shrink-0 group flex items-center justify-center bg-brand-charcoal cursor-pointer"
                id="expand-player-art-btn"
              >
                <img 
                  src={currentSong.thumbnailUrl} 
                  alt={currentSong.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-4 h-4 text-brand-gold" />
                </div>
              </button>

              <div className="min-w-0 flex-grow">
                <div className="flex items-center gap-2">
                  <h4 
                    onClick={() => setIsExpanded(true)}
                    className="font-display font-semibold text-brand-cream text-sm truncate hover:text-brand-gold cursor-pointer"
                  >
                    {currentSong.title}
                  </h4>
                  <span className="bg-brand-charcoal/50 border border-brand-gold/15 text-brand-gold font-mono text-[9px] px-1.5 rounded flex-shrink-0">
                    {currentSong.decade}
                  </span>
                </div>
                <p className="text-brand-gold/80 text-xs truncate mt-0.5">{currentSong.singerName}</p>
              </div>

              {/* Favorites toggle on bottom bar */}
              <button 
                onClick={() => handleToggleFavorite(currentSong.id)}
                className="text-brand-gold/50 hover:text-brand-gold transition-colors p-1"
                id="toggle-fav-bottom-bar-btn"
              >
                <Heart className={`w-4 h-4 ${favorites.includes(currentSong.id) ? "fill-brand-gold text-brand-gold" : ""}`} />
              </button>
            </div>

            {/* Core Playback Control Buttons */}
            <div className="flex flex-col items-center gap-1.5 w-full md:w-1/3">
              <div className="flex items-center gap-5">
                
                {/* Shuffle toggle */}
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-1.5 rounded-full transition-colors ${isShuffle ? "text-brand-gold bg-brand-emerald/10" : "text-brand-cream/40 hover:text-brand-cream"}`}
                  id="toggle-shuffle-btn"
                  title="Shuffle queue"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button 
                  onClick={handlePrevTrack}
                  className="p-1.5 text-brand-cream/80 hover:text-brand-gold hover:scale-110 active:scale-95 transition-all"
                  id="prev-track-btn"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button 
                  onClick={handleTogglePlay}
                  className="w-10 h-10 rounded-full bg-brand-gold hover:bg-brand-cream hover:scale-105 active:scale-95 text-brand-charcoal flex items-center justify-center shadow-lg transition-all"
                  id="play-pause-btn"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-brand-charcoal" />
                  ) : (
                    <Play className="w-5 h-5 fill-brand-charcoal ml-0.5" />
                  )}
                </button>

                <button 
                  onClick={handleNextTrack}
                  className="p-1.5 text-brand-cream/80 hover:text-brand-gold hover:scale-110 active:scale-95 transition-all"
                  id="next-track-btn"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                {/* Repeat toggle */}
                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`p-1.5 rounded-full transition-colors ${isRepeat ? "text-brand-gold bg-brand-emerald/10" : "text-brand-cream/40 hover:text-brand-cream"}`}
                  id="toggle-repeat-btn"
                  title="Repeat single track"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

              </div>

              {/* Progress timestamps */}
              <div className="flex gap-2 text-[10px] font-mono text-brand-cream/40 select-none">
                <span>{formatTime(playerTiming.currentTime)}</span>
                <span>/</span>
                <span>{formatTime(playerTiming.duration)}</span>
              </div>
            </div>

            {/* Volume + Live Feed Mode toggles */}
            <div className="flex items-center justify-end gap-4 w-full md:w-1/3">
              
              {/* Live Video feed mode toggle */}
              <button
                onClick={() => setShowVideo(!showVideo)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-mono transition-all ${
                  showVideo 
                    ? "bg-brand-gold text-brand-charcoal border-brand-gold hover:bg-brand-cream font-bold" 
                    : "bg-brand-charcoal/30 border-brand-gold/20 text-brand-gold hover:border-brand-gold/60"
                }`}
                id="toggle-video-mode-btn"
                title="View authentic archival video footage from PTV/Lollywood"
              >
                {showVideo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{showVideo ? "Hide Video" : "Vintage Video Feed"}</span>
              </button>

              {/* Volume Slider Block */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-brand-gold/80 hover:text-brand-gold p-1"
                  id="toggle-mute-btn"
                >
                  {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={isMuted ? 0 : volume} 
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-20 md:w-24 h-1 bg-brand-charcoal rounded-lg appearance-none cursor-pointer accent-brand-gold"
                  id="volume-slider"
                />
              </div>

              {/* Rotating Vinyl icon */}
              <div className={`hidden md:block text-brand-gold ${isPlaying ? "animate-spin-slow" : ""}`}>
                <Disc className="w-7 h-7" />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Expanded Full-Screen Overlay: Rotational Vinyl, Needle Arm, and Poetry */}
      <AnimatePresence>
        {isExpanded && currentSong && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            className="fixed inset-0 bg-[#0E1A16] z-50 overflow-y-auto px-4 py-8 md:p-12 flex flex-col justify-between"
            id="full-expanded-vinyl-viewport"
          >
            {/* Corner Ornamental Details */}
            <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-brand-gold/30 pointer-events-none rounded-tl" />
            <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-brand-gold/30 pointer-events-none rounded-tr" />
            <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-brand-gold/30 pointer-events-none rounded-bl" />
            <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-brand-gold/30 pointer-events-none rounded-br" />

            {/* Expand View Header */}
            <div className="max-w-6xl mx-auto w-full flex justify-between items-center mb-6 relative z-10">
              <div className="flex items-center gap-2">
                <Disc className="w-5 h-5 text-brand-gold animate-spin-slow" />
                <span className="font-mono text-xs text-brand-gold tracking-widest uppercase">VINYL RECORD SLEEVE VIEW</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-10 h-10 rounded-full bg-brand-charcoal border border-brand-gold/30 hover:border-brand-gold flex items-center justify-center text-brand-gold cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all"
                id="minimize-player-overlay-btn"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>

            {/* Main Interactive Deck */}
            <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-grow">
              
              {/* Rotating Record and Sleeve Visualizers */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
                
                {/* Physical Tonearm / Needle */}
                <div 
                  className="absolute -top-6 right-20 w-32 h-40 origin-top-right transition-transform duration-500 z-30 pointer-events-none hidden md:block"
                  style={{
                    transform: isPlaying ? "rotate(18deg)" : "rotate(-10deg)"
                  }}
                >
                  {/* Brass Arm drawing using inline SVG */}
                  <svg viewBox="0 0 100 150" className="w-full h-full">
                    <path d="M90,10 L50,15 L45,110 L25,130" fill="none" stroke="#C9A84C" strokeWidth="4" />
                    <circle cx="90" cy="10" r="8" fill="#1C1C1C" stroke="#C9A84C" strokeWidth="2" />
                    <rect x="18" y="125" width="14" height="18" rx="2" fill="#C9A84C" transform="rotate(20 25 130)" />
                  </svg>
                </div>

                {/* Sleeve Box wrapper */}
                <div className="relative w-72 h-72 sm:w-96 sm:h-96 aspect-square rounded-2xl bg-[#1E2E28] border-2 border-brand-gold p-6 shadow-2xl relative flex items-center justify-center">
                  
                  {/* Sleeve design elements */}
                  <div className="absolute inset-4 border border-brand-gold/15 rounded-xl pointer-events-none" />
                  
                  {/* Center Circle Label hole (vintage look) */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 rounded-full border-4 border-[#12221C] bg-[#1E2E28] flex items-center justify-center overflow-hidden shadow-inner">
                      <img 
                        src={currentSong.thumbnailUrl} 
                        alt={currentSong.title} 
                        className={`w-full h-full object-cover opacity-80 ${isPlaying ? "animate-spin-slow" : ""}`}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Grooved Vinyl Record slide out background effect */}
                  <div className={`absolute w-[94%] h-[94%] rounded-full bg-black border-4 border-[#222] shadow-2xl mix-blend-screen opacity-90 ${isPlaying ? "animate-spin-grooves" : ""}`}>
                    {/* Vinyl grooves shine rings */}
                    <div className="absolute inset-[10%] rounded-full border border-white/5" />
                    <div className="absolute inset-[20%] rounded-full border border-white/5" />
                    <div className="absolute inset-[30%] rounded-full border border-white/5" />
                    <div className="absolute inset-[40%] rounded-full border border-white/5" />
                  </div>
                </div>

                <p className="mt-6 font-display italic text-brand-gold text-sm tracking-wide text-center">
                  "Vintage Vinyl • Timeless Timbre"
                </p>
              </div>

              {/* Song details, Ghazal lyric translation and Controls */}
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-2 border-b border-brand-gold/15 pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="bg-brand-emerald border border-brand-gold/30 text-brand-gold text-[10px] font-mono px-2.5 py-1 rounded">
                        {currentSong.decade} ERA
                      </span>
                      <h1 className="font-display text-3xl md:text-4xl font-semibold text-brand-cream mt-2 tracking-tight">
                        {currentSong.title}
                      </h1>
                      <h2 className="text-brand-gold font-sans text-base font-semibold mt-1">
                        {currentSong.singerName}
                        {currentSong.urduSingerName && (
                          <span className="font-urdu text-brand-gold/40 text-sm ml-2 select-none">
                            {currentSong.urduSingerName}
                          </span>
                        )}
                      </h2>
                    </div>
                    
                    <button
                      onClick={() => handleToggleFavorite(currentSong.id)}
                      className="text-brand-gold/70 hover:text-brand-gold transition-transform p-2 active:scale-90"
                      id="expand-fav-toggle-btn"
                    >
                      <Heart className={`w-7 h-7 ${favorites.includes(currentSong.id) ? "fill-brand-gold text-brand-gold" : ""}`} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-mono text-brand-cream/60">
                    <span>SINF (GENRE): {currentSong.genre}</span>
                    <span>•</span>
                    <span>TOTAL PLAYS: {currentSong.playCount || 0}</span>
                  </div>
                </div>

                {/* Ghazal / Song Poetic Verse card */}
                <div className="bg-[#1E2E28]/50 border border-brand-gold/20 p-5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono text-brand-gold">
                    <span>BAIT-SHAAIRI (POETIC TRANSLATION)</span>
                    <span className="font-urdu">شاعری</span>
                  </div>

                  <div className="space-y-4 py-2">
                    {/* Dynamic translation based on song title */}
                    {currentSong.title.includes("Ranjish") ? (
                      <>
                        <div className="text-center font-urdu text-lg text-brand-gold select-none tracking-normal">
                          رنجش ہی سہی دل ہی دکھانے کے لیے آ<br />
                          آ پھر سے مجھے چھوڑ کے جانے کے لیے آ
                        </div>
                        <p className="text-xs text-center text-brand-cream/70 italic leading-relaxed">
                          "Even if out of resentment, come to break my heart again... Come, even if just to leave me abandoned once more."
                        </p>
                      </>
                    ) : currentSong.title.includes("Zid") || currentSong.title.includes("Zid") ? (
                      <>
                        <div className="text-center font-urdu text-lg text-brand-gold select-none tracking-normal">
                          آج جانے کی ضد نہ کرو<br />
                          یوں ہی پہلو میں بیٹھے رہو
                        </div>
                        <p className="text-xs text-center text-brand-cream/70 italic leading-relaxed">
                          "Do not persist in leaving tonight, stay nestled closely by my side... Time stands still as long as you are near."
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-center font-urdu text-lg text-brand-gold select-none tracking-normal">
                          روحِ موسیقی کا ایک سفر<br />
                          آواز کی گہرائی سے دل تک
                        </div>
                        <p className="text-xs text-center text-brand-cream/70 italic leading-relaxed">
                          "A nostalgic auditory journey from the depths of our cultural archives directly to your soul."
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Interactive Player controls inside fullview */}
                <div className="flex flex-col gap-4">
                  {/* Progress slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-brand-cream/40">
                      <span>{formatTime(playerTiming.currentTime)}</span>
                      <span>{formatTime(playerTiming.duration)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-brand-charcoal rounded-full cursor-pointer relative">
                      <div 
                        className="h-full bg-brand-gold rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Standard Play buttons inside Expanded Screen */}
                  <div className="flex justify-center items-center gap-8 py-2">
                    <button 
                      onClick={handlePrevTrack}
                      className="p-2 text-brand-cream hover:text-brand-gold hover:scale-110 active:scale-95 transition-all"
                      id="expand-prev-track-btn"
                    >
                      <SkipBack className="w-7 h-7" />
                    </button>

                    <button 
                      onClick={handleTogglePlay}
                      className="w-14 h-14 rounded-full bg-brand-gold hover:bg-brand-cream text-brand-charcoal hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-2xl shadow-brand-emerald/50"
                      id="expand-play-pause-btn"
                    >
                      {isPlaying ? (
                        <Pause className="w-7 h-7 fill-brand-charcoal" />
                      ) : (
                        <Play className="w-7 h-7 fill-brand-charcoal ml-1" />
                      )}
                    </button>

                    <button 
                      onClick={handleNextTrack}
                      className="p-2 text-brand-cream hover:text-brand-gold hover:scale-110 active:scale-95 transition-all"
                      id="expand-next-track-btn"
                    >
                      <SkipForward className="w-7 h-7" />
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom info banner */}
            <div className="max-w-6xl mx-auto w-full text-center text-[10px] text-brand-cream/30 font-mono pt-4 border-t border-brand-gold/10 relative z-10">
              CULTURE PRESERVATION ARCHIVE • DESIGNED IN TRADITIONAL EMI SLEEVE ART
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
