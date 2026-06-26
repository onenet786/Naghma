import React, { useState, useEffect } from "react";
import { Collection, Song } from "../types";
import { ListMusic, Disc, Compass, ArrowLeft, Play, Plus, Heart } from "lucide-react";

interface CollectionsTabProps {
  collections: Collection[];
  favorites: string[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlay: (song: Song) => void;
  onToggleFavorite: (songId: string) => void;
}

export default function CollectionsTab({
  collections,
  favorites,
  currentSong,
  isPlaying,
  onPlay,
  onToggleFavorite
}: CollectionsTabProps) {
  const [selectedColId, setSelectedColId] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch full collection with populated songs
  const fetchCollectionSongs = async (colId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/collections/${colId}`);
      const data = await response.json();
      setActiveCollection(data);
    } catch (e) {
      console.error("Failed to load collection:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedColId) {
      fetchCollectionSongs(selectedColId);
    } else {
      setActiveCollection(null);
    }
  }, [selectedColId]);

  return (
    <div className="space-y-6" id="collections-tab-container">
      {/* Dynamic Back Navigation for item view */}
      {selectedColId ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <button
            onClick={() => setSelectedColId(null)}
            className="flex items-center gap-2 text-brand-gold hover:text-brand-cream font-mono text-xs cursor-pointer"
            id="back-to-collections-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Makhzan-e-Kutub (Back to Collections)</span>
          </button>

          {loading || !activeCollection ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Disc className="w-12 h-12 text-brand-gold animate-spin-slow" />
              <p className="text-brand-gold font-mono text-xs">Opening archive box...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Collection Side Info */}
              <div className="md:col-span-4 space-y-4">
                <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-brand-gold/30 shadow-2xl">
                  <div className="absolute inset-2 border border-brand-gold/15 pointer-events-none rounded-lg" />
                  <img
                    src={activeCollection.coverImage}
                    alt={activeCollection.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute right-2 top-2 bg-brand-charcoal/90 border border-brand-gold/30 text-brand-gold px-2.5 py-1 rounded text-[10px] font-mono tracking-wider">
                    CURATED
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-semibold text-[#F5F0E8] text-xl">
                    {activeCollection.name}
                  </h3>
                  <p className="text-brand-cream/70 text-xs leading-relaxed border-l border-brand-gold/20 pl-3">
                    {activeCollection.description}
                  </p>
                </div>
              </div>

              {/* Populated Songs List */}
              <div className="md:col-span-8 space-y-4">
                <div className="flex justify-between items-end border-b border-brand-gold/10 pb-2">
                  <span className="font-mono text-[10px] text-brand-cream/60">
                    {activeCollection.songs?.length || 0} SEED MELODIES AVAILABLE
                  </span>
                  <span className="font-urdu text-brand-gold/40 text-xs select-none">منتخب نغمات</span>
                </div>

                <div className="space-y-2">
                  {activeCollection.songs?.map((song: Song, idx: number) => (
                    <div
                      key={song.id}
                      className={`group flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 ${
                        currentSong?.id === song.id
                          ? "bg-brand-emerald/30 border-brand-gold/60 shadow-lg"
                          : "bg-[#1E2E28]/40 border-brand-gold/15 hover:border-brand-gold/40 hover:bg-brand-emerald/20"
                      }`}
                    >
                      {/* Index / Hover Play */}
                      <div className="w-8 h-8 rounded-lg bg-brand-charcoal border border-brand-gold/15 flex items-center justify-center text-brand-gold/60 text-xs font-mono relative">
                        <span className="group-hover:opacity-0 transition-opacity">
                          {idx + 1}
                        </span>
                        <button
                          onClick={() => onPlay(song)}
                          className="absolute inset-0 bg-brand-gold hover:bg-brand-cream text-brand-charcoal flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded"
                          id={`col-play-row-${song.id}`}
                        >
                          <Play className="w-4 h-4 fill-brand-charcoal" />
                        </button>
                      </div>

                      {/* Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-semibold text-[#F5F0E8] text-sm truncate">
                            {song.title}
                          </h4>
                          <span className="bg-brand-charcoal/40 text-brand-gold border border-brand-gold/10 text-[9px] px-1 rounded font-mono">
                            {song.decade}
                          </span>
                        </div>
                        <p className="text-brand-gold/80 text-xs font-sans mt-0.5 truncate">
                          {song.singerName}
                        </p>
                      </div>

                      {/* Right meta controls */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-brand-cream/40 font-mono hidden sm:inline">
                          {song.genre}
                        </span>
                        <button
                          onClick={() => onToggleFavorite(song.id)}
                          className="text-brand-gold/50 hover:text-brand-gold transition-colors"
                          id={`col-fav-row-${song.id}`}
                        >
                          <Heart className={`w-4 h-4 ${favorites.includes(song.id) ? "fill-brand-gold text-brand-gold" : ""}`} />
                        </button>
                        <button
                          onClick={() => onPlay(song)}
                          className="text-brand-gold hover:text-brand-cream p-1 transition-transform group-hover:scale-110"
                          id={`col-control-row-${song.id}`}
                        >
                          <Compass className={`w-5 h-5 ${currentSong?.id === song.id && isPlaying ? "animate-spin-slow" : ""}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-end border-b border-brand-gold/10 pb-2">
            <h2 className="font-display text-xl md:text-2xl font-semibold text-[#F5F0E8] flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-brand-gold" />
              <span>Saughaat (Curated Collections)</span>
            </h2>
            <span className="font-urdu text-brand-gold/60 text-sm select-none">سوغات</span>
          </div>

          {/* Collections Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((col) => (
              <div
                key={col.id}
                onClick={() => setSelectedColId(col.id)}
                className="group relative bg-[#1E2E28] rounded-xl border border-brand-gold/20 hover:border-brand-gold hover:shadow-2xl hover:shadow-brand-emerald/40 p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                id={`col-grid-card-${col.id}`}
              >
                {/* Decorative Frame */}
                <div className="absolute inset-2 border border-brand-gold/10 pointer-events-none rounded-lg group-hover:border-brand-gold/20 transition-colors" />

                <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-brand-gold/10 mb-4 bg-brand-charcoal">
                  <img
                    src={col.coverImage}
                    alt={col.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-brand-charcoal/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-4 py-2 bg-brand-gold text-brand-charcoal rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-lg">
                      <Compass className="w-4 h-4 animate-spin-slow" />
                      <span>Explore Archive</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 relative z-10">
                  <h3 className="font-display font-semibold text-[#F5F0E8] text-base group-hover:text-brand-gold transition-colors duration-200">
                    {col.name}
                  </h3>
                  <p className="text-brand-cream/60 text-xs line-clamp-2">
                    {col.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-brand-gold/10 flex justify-between items-center text-[10px] text-brand-gold font-mono relative z-10">
                  <span>CURATED CATALOG</span>
                  <span>{col.songIds?.length || 0} TRACKS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
