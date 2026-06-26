import React from "react";
import { Song } from "../types";
import { Play, Disc, Heart } from "lucide-react";

interface VintageCardProps {
  key?: string | number;
  song: Song;
  onPlay: (song: Song) => void;
  isCurrent: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  onToggleFavorite: (songId: string) => void;
}

export default function VintageCard({
  song,
  onPlay,
  isCurrent,
  isPlaying,
  isFavorite,
  onToggleFavorite
}: VintageCardProps): React.JSX.Element {
  // Determine rotating vinyl color based on decade
  const getVinylColorClass = (decade: string) => {
    switch (decade) {
      case "1950s": return "text-amber-600/80";
      case "1960s": return "text-yellow-600/80";
      case "1970s": return "text-emerald-600/80";
      case "1980s": return "text-red-600/80";
      case "1990s": return "text-blue-600/80";
      default: return "text-yellow-600/80";
    }
  };

  return (
    <div 
      className="group relative bg-[#1E2E28] rounded-xl border border-brand-gold/20 p-4 transition-all duration-300 hover:border-brand-gold/60 hover:shadow-2xl hover:shadow-brand-emerald/40 flex flex-col justify-between overflow-hidden"
      id={`vintage-card-${song.id}`}
    >
      {/* Decorative Ornate Border Accent */}
      <div className="absolute inset-2 border border-brand-gold/10 pointer-events-none rounded-lg group-hover:border-brand-gold/30 transition-colors duration-300" />

      {/* Main Image Sleeve */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-brand-charcoal border border-brand-gold/10 mb-4 z-10 flex items-center justify-center">
        <img 
          src={song.thumbnailUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60"} 
          alt={song.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Hover Vinyl Record Slide-out / Spin overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button 
            onClick={() => onPlay(song)}
            className="w-12 h-12 rounded-full bg-brand-gold text-brand-charcoal flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200 shadow-lg"
            id={`play-btn-card-${song.id}`}
          >
            {isCurrent && isPlaying ? (
              <span className="flex items-center gap-0.5 justify-center">
                <span className="w-1 h-4 bg-brand-charcoal animate-bounce rounded-full [animation-delay:0.1s]" />
                <span className="w-1 h-5 bg-brand-charcoal animate-bounce rounded-full [animation-delay:0.3s]" />
                <span className="w-1 h-4 bg-brand-charcoal animate-bounce rounded-full [animation-delay:0.5s]" />
              </span>
            ) : (
              <Play className="w-6 h-6 fill-brand-charcoal ml-1" />
            )}
          </button>
        </div>

        {/* Floating Decade Badge */}
        <div className="absolute top-2 left-2 bg-brand-charcoal/90 border border-brand-gold/30 text-brand-gold px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider z-20">
          {song.decade}
        </div>

        {/* Animated Spin Indicator when current song is playing */}
        {isCurrent && isPlaying && (
          <div className="absolute bottom-2 right-2 bg-brand-emerald text-brand-gold p-1.5 rounded-full shadow-lg border border-brand-gold animate-spin-slow z-20">
            <Disc className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Song Details */}
      <div className="relative z-10 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-1">
          <h3 className="font-display font-semibold text-[#F5F0E8] text-base group-hover:text-brand-gold transition-colors duration-200 line-clamp-1">
            {song.title}
          </h3>
          <button 
            onClick={() => onToggleFavorite(song.id)}
            className="text-brand-gold/50 hover:text-brand-gold transition-colors duration-200 p-0.5"
            id={`fav-btn-card-${song.id}`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-brand-gold text-brand-gold" : ""}`} />
          </button>
        </div>

        <div className="flex justify-between items-center mt-1">
          <p className="text-[#C9A84C]/80 text-xs font-sans font-medium">
            {song.singerName}
          </p>
          {song.urduSingerName && (
            <span className="font-urdu text-xs text-brand-gold/40 tracking-normal select-none">
              {song.urduSingerName}
            </span>
          )}
        </div>

        {/* Footer Meta */}
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-brand-gold/10 text-[10px] text-brand-cream/60 font-mono">
          <span className="bg-brand-charcoal/40 px-1.5 py-0.5 rounded border border-brand-gold/5 text-brand-gold/80 font-mono text-[9px]">
            {song.genre}
          </span>
          <span className="opacity-80">
            {song.playCount ? `${song.playCount} ghazal-joys` : "0 plays"}
          </span>
        </div>
      </div>
    </div>
  );
}
