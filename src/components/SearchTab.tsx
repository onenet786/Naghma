import React, { useState, useEffect } from "react";
import { Song } from "../types";
import VintageCard from "./VintageCard";
import { Search, SlidersHorizontal, Sparkles, Disc, RefreshCw, X } from "lucide-react";

interface SearchTabProps {
  favorites: string[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlay: (song: Song) => void;
  onToggleFavorite: (songId: string) => void;
  initialSearchQuery?: string;
  initialDecade?: string;
  initialGenre?: string;
}

export default function SearchTab({
  favorites,
  currentSong,
  isPlaying,
  onPlay,
  onToggleFavorite,
  initialSearchQuery = "",
  initialDecade = "",
  initialGenre = ""
}: SearchTabProps) {
  const [query, setQuery] = useState(initialSearchQuery);
  const [selectedDecade, setSelectedDecade] = useState(initialDecade);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  const genres = ["Ghazal", "Qawwali", "Film Song", "Folk", "Pop"];
  const decades = ["1950s", "1960s", "1970s", "1980s", "1990s"];

  // Perform search helper
  const performSearch = async (currentQuery: string, decade: string, genre: string) => {
    setLoading(true);
    setAiUsed(false);
    try {
      const params = new URLSearchParams();
      if (currentQuery) params.append("q", currentQuery);
      if (decade) params.append("decade", decade);
      if (genre) params.append("genre", genre);

      // We hit the search endpoint which automatically uses Gemini if local results are insufficient!
      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      setResults(data);
      
      // If any result starts with song-dyn- it means Gemini fetched it dynamically!
      const containsDynamic = data.some((s: Song) => s.id.startsWith("song-dyn-"));
      setAiUsed(containsDynamic);
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on filter changes or initial load
  useEffect(() => {
    performSearch(query, selectedDecade, selectedGenre);
  }, [selectedDecade, selectedGenre]);

  // Sync initial props from Explore tab clicks
  useEffect(() => {
    if (initialSearchQuery) setQuery(initialSearchQuery);
    if (initialDecade) setSelectedDecade(initialDecade);
    if (initialGenre) setSelectedGenre(initialGenre);
    
    performSearch(initialSearchQuery || query, initialDecade || selectedDecade, initialGenre || selectedGenre);
  }, [initialSearchQuery, initialDecade, initialGenre]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, selectedDecade, selectedGenre);
  };

  const handleClearFilters = () => {
    setQuery("");
    setSelectedDecade("");
    setSelectedGenre("");
    performSearch("", "", "");
  };

  return (
    <div className="space-y-6" id="search-tab-container">
      {/* Search Header */}
      <div className="flex justify-between items-end border-b border-brand-gold/10 pb-2">
        <h2 className="font-display text-xl md:text-2xl font-semibold text-[#F5F0E8] flex items-center gap-2">
          <Search className="w-5 h-5 text-brand-gold" />
          <span>Daryaft (Search & Explore)</span>
        </h2>
        <span className="font-urdu text-brand-gold/60 text-sm select-none">دریافت</span>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleSubmit} className="relative flex gap-2">
        <div className="relative flex-grow">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search classic song titles, singers (e.g. Mehdi Hassan), films..."
            className="w-full bg-[#162520] border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold focus:outline-none rounded-xl py-3 pl-11 pr-4 text-brand-cream text-sm placeholder-brand-cream/40 shadow-inner"
            id="search-input-field"
          />
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-brand-gold/60" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-gold text-brand-charcoal hover:bg-brand-cream hover:scale-[1.02] disabled:opacity-50 px-6 py-3 rounded-xl font-medium text-xs md:text-sm transition-all shadow-md flex items-center gap-2 flex-shrink-0"
          id="search-submit-btn"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Aahang AI Search</span>
            </>
          )}
        </button>
      </form>

      {/* Advanced Filter Sliders & Chips */}
      <div className="bg-[#1E2E28]/60 rounded-xl border border-brand-gold/10 p-4 space-y-4">
        <div className="flex items-center gap-2 text-brand-gold/80 font-mono text-[10px] uppercase tracking-wider">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Intikhaab (Refine Filters)</span>
        </div>

        {/* Decade Filter Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-brand-cream/60">Decade (Era)</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDecade("")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedDecade === ""
                  ? "bg-brand-gold text-brand-charcoal"
                  : "bg-brand-charcoal/40 border border-brand-gold/10 text-brand-cream hover:border-brand-gold/40"
              }`}
              id="decade-all-chip"
            >
              All Eras
            </button>
            {decades.map((dec) => (
              <button
                key={dec}
                onClick={() => setSelectedDecade(dec)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedDecade === dec
                    ? "bg-brand-gold text-brand-charcoal"
                    : "bg-brand-charcoal/40 border border-brand-gold/10 text-brand-cream hover:border-brand-gold/40"
                }`}
                id={`decade-chip-${dec}`}
              >
                {dec}
              </button>
            ))}
          </div>
        </div>

        {/* Genre Filter Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-brand-cream/60">Genre (Sinf)</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGenre("")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedGenre === ""
                  ? "bg-brand-gold text-brand-charcoal"
                  : "bg-brand-charcoal/40 border border-brand-gold/10 text-brand-cream hover:border-brand-gold/40"
              }`}
              id="genre-all-chip"
            >
              All Genres
            </button>
            {genres.map((gen) => (
              <button
                key={gen}
                onClick={() => setSelectedGenre(gen)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedGenre === gen
                    ? "bg-brand-gold text-brand-charcoal"
                    : "bg-brand-charcoal/40 border border-brand-gold/10 text-brand-cream hover:border-brand-gold/40"
                }`}
                id={`genre-chip-${gen}`}
              >
                {gen}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filter Button */}
        {(query || selectedDecade || selectedGenre) && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-brand-gold hover:text-brand-cream flex items-center gap-1 font-mono pt-1 transition-colors"
            id="clear-filters-btn"
          >
            <X className="w-3.5 h-3.5" />
            <span>Sard-e-No (Reset Filters)</span>
          </button>
        )}
      </div>

      {/* Gemini AI Status Indicator */}
      {aiUsed && !loading && (
        <div className="bg-brand-emerald/20 border border-brand-gold/30 rounded-xl p-3 flex gap-3 items-center text-xs text-brand-gold">
          <Sparkles className="w-5 h-5 text-brand-gold flex-shrink-0 animate-pulse" />
          <p>
            <strong>Aahang AI Engaged:</strong> Real-time search performed via Gemini Google Search Grounding to find verified vintage recordings and metadata on YouTube matching your query!
          </p>
        </div>
      )}

      {/* Results Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4" id="search-loading-indicator">
          <div className="relative w-16 h-16">
            <Disc className="w-full h-full text-brand-gold animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-gold animate-pulse" />
            </div>
          </div>
          <p className="text-brand-gold font-display italic text-sm animate-pulse">
            Consulting cultural archives and matching YouTube vintage footage...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-brand-cream/60 font-mono">
            <span>FOUND {results.length} CLASSIC MATCHES</span>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-brand-gold/10 rounded-xl bg-brand-charcoal/20">
              <p className="text-brand-cream/80 text-sm">
                No matching classic recordings found in current index.
              </p>
              <button
                onClick={() => performSearch(query || "Mehdi Hassan", selectedDecade, selectedGenre)}
                className="mt-3 text-xs text-brand-gold hover:underline font-mono"
                id="search-retry-btn"
              >
                Search legendary Mehdi Hassan instead?
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {results.map((song) => (
                <VintageCard
                  key={song.id}
                  song={song}
                  onPlay={onPlay}
                  isCurrent={currentSong?.id === song.id}
                  isPlaying={isPlaying}
                  isFavorite={favorites.includes(song.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
