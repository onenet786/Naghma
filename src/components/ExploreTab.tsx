import React from "react";
import { Song, Collection } from "../types";
import VintageCard from "./VintageCard";
import { Disc, Sparkles, TrendingUp, Music, Compass, ChevronRight } from "lucide-react";

interface ExploreTabProps {
  songs: Song[];
  collections: Collection[];
  favorites: string[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlay: (song: Song) => void;
  onToggleFavorite: (songId: string) => void;
  onSelectDecade: (decade: string) => void;
  onSelectGenre: (genre: string) => void;
  onSelectSinger: (singer: string) => void;
}

// Classical Singers pre-population list
const CLASSIC_SINGERS = [
  { name: "Mehdi Hassan", urdu: "مہدی حسن", avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=60", query: "Mehdi Hassan" },
  { name: "Noor Jehan", urdu: "نور جہاں", avatar: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=60", query: "Noor Jehan" },
  { name: "Nusrat Fateh Ali Khan", urdu: "نصرت فتح علی خان", avatar: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=150&auto=format&fit=crop&q=60", query: "Nusrat" },
  { name: "Farida Khanum", urdu: "فریدہ خانم", avatar: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=150&auto=format&fit=crop&q=60", query: "Farida Khanum" },
  { name: "Ghulam Ali", urdu: "غلام علی", avatar: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150&auto=format&fit=crop&q=60", query: "Ghulam Ali" },
  { name: "Iqbal Bano", urdu: "اقبال بانو", avatar: "https://images.unsplash.com/photo-1487180142328-054b783fc471?w=150&auto=format&fit=crop&q=60", query: "Iqbal Bano" },
  { name: "Runa Laila", urdu: "رونا لیلیٰ", avatar: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop&q=60", query: "Runa Laila" },
  { name: "Nayyara Noor", urdu: "نیرہ نور", avatar: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=150&auto=format&fit=crop&q=60", query: "Nayyara" }
];

export default function ExploreTab({
  songs,
  collections,
  favorites,
  currentSong,
  isPlaying,
  onPlay,
  onToggleFavorite,
  onSelectDecade,
  onSelectGenre,
  onSelectSinger
}: ExploreTabProps) {
  // Find a featured "Song of the Day"
  const songOfTheDay = songs.find(s => s.isFeatured) || songs[0];

  // Get top trending songs based on playCount
  const trendingSongs = [...songs]
    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
    .slice(0, 4);

  return (
    <div className="space-y-10" id="explore-tab-container">
      {/* 1. Hero Guldasta Section with Vintage Pakistani Vibe */}
      <div className="relative bg-gradient-to-br from-brand-emerald to-[#133529] rounded-2xl p-6 md:p-8 border border-brand-gold/30 shadow-2xl overflow-hidden">
        {/* Calligraphic/Watermark background */}
        <div className="absolute right-0 bottom-0 opacity-10 font-urdu text-[10rem] md:text-[14rem] select-none pointer-events-none leading-none select-none text-brand-gold">
          موسیقی
        </div>
        <div className="absolute left-6 top-6 w-32 h-32 border-l border-t border-brand-gold/20 pointer-events-none" />
        <div className="absolute right-6 bottom-6 w-32 h-32 border-r border-b border-brand-gold/20 pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-brand-charcoal/40 border border-brand-gold/30 px-3 py-1 rounded-full text-xs text-brand-gold font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SADAA-E-NAGHMA • صداۓ نغمہ</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-brand-cream tracking-tight leading-tight">
            Purani Yaadon Ka <span className="text-brand-gold italic">Nostalgic</span> Safar
          </h1>
          <p className="text-brand-cream/80 text-sm md:text-base leading-relaxed">
            Welcome to the premier cultural archive of classical Pakistani melodies (1950s–1990s). Enjoy pristine record sleeve aesthetics, authentic PTV and Lollywood television streams, and rich poetry.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => songOfTheDay && onPlay(songOfTheDay)}
              className="px-6 py-2.5 bg-brand-gold text-brand-charcoal font-medium rounded-lg hover:bg-brand-cream hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg flex items-center gap-2"
              id="play-song-day-btn"
            >
              <Disc className="w-5 h-5 animate-spin-slow" />
              <span>Ghazal of the Day</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Classical Legend Singers row */}
      <div className="space-y-4">
        <div className="flex justify-between items-end border-b border-brand-gold/10 pb-2">
          <h2 className="font-display text-xl md:text-2xl font-semibold text-[#F5F0E8] flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-gold" />
            <span>Asateen-e-Moseeqi (The Legends)</span>
          </h2>
          <span className="font-urdu text-brand-gold/60 text-sm select-none">اساطینِ موسیقی</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x -mx-4 px-4 md:mx-0 md:px-0">
          {CLASSIC_SINGERS.map((singer) => (
            <button
              key={singer.name}
              onClick={() => onSelectSinger(singer.query)}
              className="flex-shrink-0 group flex flex-col items-center gap-2 w-24 snap-start focus:outline-none"
              id={`singer-btn-${singer.name.replace(/\s+/g, "-")}`}
            >
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-brand-gold/20 group-hover:border-brand-gold group-hover:shadow-lg group-hover:shadow-brand-emerald/50 transition-all duration-300">
                <div className="absolute inset-0 bg-brand-emerald/20 group-hover:bg-transparent transition-colors duration-300" />
                <img
                  src={singer.avatar}
                  alt={singer.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <span className="text-brand-cream/90 text-[11px] md:text-xs font-semibold tracking-tight text-center group-hover:text-brand-gold transition-colors duration-200 line-clamp-1 w-full">
                {singer.name}
              </span>
              <span className="font-urdu text-[10px] text-brand-gold/40 group-hover:text-brand-gold/80 transition-colors duration-200 select-none">
                {singer.urdu}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Browse Decades Quick Selector (Curated Tabs) */}
      <div className="space-y-4">
        <div className="flex justify-between items-end border-b border-brand-gold/10 pb-2">
          <h2 className="font-display text-xl md:text-2xl font-semibold text-[#F5F0E8] flex items-center gap-2">
            <Music className="w-5 h-5 text-brand-gold" />
            <span>Daur-by-Daur (Decades Era)</span>
          </h2>
          <span className="font-urdu text-brand-gold/60 text-sm select-none">دور بہ دور</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {["1950s", "1960s", "1970s", "1980s", "1990s"].map((dec) => (
            <button
              key={dec}
              onClick={() => onSelectDecade(dec)}
              className="group relative bg-[#1E2E28] rounded-xl border border-brand-gold/20 p-4 hover:border-brand-gold hover:shadow-xl hover:shadow-brand-emerald/30 transition-all duration-300 text-left overflow-hidden"
              id={`decade-grid-btn-${dec}`}
            >
              <div className="absolute inset-2 border border-brand-gold/5 rounded-lg group-hover:border-brand-gold/20 transition-colors duration-300" />
              <div className="absolute right-0 bottom-0 text-brand-gold/5 font-display text-5xl font-bold select-none leading-none">
                {dec.slice(2, 4)}
              </div>
              <span className="text-brand-gold font-mono text-xs block mb-1">THE ERA OF</span>
              <h3 className="font-display font-bold text-lg text-brand-cream group-hover:text-brand-gold transition-colors duration-200">
                {dec}
              </h3>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Song of the Day Showcase & Trending */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Song of the Day Sleeve */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex justify-between items-end border-b border-brand-gold/10 pb-2">
            <h3 className="font-display text-lg font-semibold text-[#F5F0E8] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-gold" />
              <span>Guldasta-e-Imroz (Feature)</span>
            </h3>
            <span className="font-urdu text-brand-gold/40 text-xs select-none">گلدستہِ امروز</span>
          </div>

          {songOfTheDay && (
            <div className="relative group bg-gradient-to-br from-[#1E2E28] to-[#12221C] border border-brand-gold/30 rounded-xl p-5 shadow-xl flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-2 border border-brand-gold/10 pointer-events-none rounded-lg" />
              
              <div className="flex gap-4 items-center mb-4 relative z-10">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-brand-gold/20 flex-shrink-0">
                  <img 
                    src={songOfTheDay.thumbnailUrl} 
                    alt={songOfTheDay.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-brand-charcoal/40 flex items-center justify-center">
                    <button
                      onClick={() => onPlay(songOfTheDay)}
                      className="w-8 h-8 rounded-full bg-brand-gold text-brand-charcoal flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                      id="play-featured-btn"
                    >
                      <Compass className={`w-4 h-4 ${currentSong?.id === songOfTheDay.id && isPlaying ? "animate-spin-slow" : ""}`} />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-brand-gold font-mono text-[10px] tracking-wider uppercase bg-brand-charcoal/50 border border-brand-gold/20 px-2 py-0.5 rounded">
                    FEATURED CLASSIC
                  </span>
                  <h4 className="font-display font-bold text-lg text-brand-cream mt-1 line-clamp-1">
                    {songOfTheDay.title}
                  </h4>
                  <p className="text-brand-gold/80 text-xs mt-0.5 font-medium flex items-center gap-1">
                    {songOfTheDay.singerName}
                    {songOfTheDay.urduSingerName && (
                      <span className="font-urdu text-[10px] text-brand-gold/40 select-none">
                        ({songOfTheDay.urduSingerName})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <p className="text-brand-cream/70 text-xs leading-relaxed italic border-l-2 border-brand-gold/40 pl-3 mb-4 py-0.5 relative z-10">
                "A pristine melody capturing the delicate poetry of Urdu literature and classic Pakistani instrumentation. Experience the rich acoustic vinyl timbre."
              </p>

              <div className="flex justify-between items-center text-[10px] text-brand-cream/50 font-mono pt-2 border-t border-brand-gold/10 relative z-10">
                <span>GENRE: {songOfTheDay.genre}</span>
                <span>DECADE: {songOfTheDay.decade}</span>
              </div>
            </div>
          )}
        </div>

        {/* Popular Tracks list */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-end border-b border-brand-gold/10 pb-2">
            <h3 className="font-display text-lg font-semibold text-[#F5F0E8] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-gold" />
              <span>Maqbool Naghme (Trending)</span>
            </h3>
            <span className="font-urdu text-brand-gold/40 text-xs select-none">مقبول نغمے</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trendingSongs.map((song) => (
              <div
                key={song.id}
                className={`flex gap-3 items-center p-2 rounded-lg border transition-all duration-300 ${
                  currentSong?.id === song.id
                    ? "bg-brand-emerald/30 border-brand-gold shadow-md"
                    : "bg-[#162520] border-brand-gold/10 hover:border-brand-gold/30 hover:bg-brand-emerald/10"
                }`}
              >
                <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                  <img src={song.thumbnailUrl} alt={song.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    onClick={() => onPlay(song)}
                    className="absolute inset-0 bg-brand-charcoal/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    id={`play-trending-item-${song.id}`}
                  >
                    <Disc className="w-4 h-4 text-brand-gold animate-spin-slow" />
                  </button>
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-display font-medium text-xs text-brand-cream truncate">
                    {song.title}
                  </h4>
                  <p className="text-brand-gold/70 text-[10px] truncate">
                    {song.singerName}
                  </p>
                </div>
                <button
                  onClick={() => onPlay(song)}
                  className="p-1 rounded hover:bg-brand-gold/15 text-brand-gold"
                  id={`play-trending-btn-${song.id}`}
                >
                  <Compass className={`w-4 h-4 ${currentSong?.id === song.id && isPlaying ? "animate-spin-slow" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
