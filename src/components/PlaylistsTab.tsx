import React, { useState, useEffect } from "react";
import { Playlist, Song } from "../types";
import { Heart, ListPlus, Music, Trash2, Calendar, Compass, Disc, RefreshCw, Sparkles, Play } from "lucide-react";

interface PlaylistsTabProps {
  songs: Song[];
  favorites: string[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlay: (song: Song) => void;
  onToggleFavorite: (songId: string) => void;
}

export default function PlaylistsTab({
  songs,
  favorites,
  currentSong,
  isPlaying,
  onPlay,
  onToggleFavorite
}: PlaylistsTabProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [recentHistory, setRecentHistory] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch all playlists
  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/playlists");
      const data = await response.json();
      setPlaylists(data);
    } catch (e) {
      console.error("Failed to fetch playlists:", e);
    }
  };

  // Fetch recently played songs
  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/history");
      const data = await response.json();
      setRecentHistory(data);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPlaylists(), fetchHistory()]).finally(() => setLoading(false));
  }, []);

  // Create playlist
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName })
      });
      const data = await response.json();
      setPlaylists([...playlists, data]);
      setNewPlaylistName("");
    } catch (e) {
      console.error("Failed to create playlist:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // Remove song from playlist
  const handleRemoveFromPlaylist = async (playlistId: string, songId: string) => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId })
      });
      const updatedPlaylist = await response.json();
      
      // Update local state
      setPlaylists(playlists.map(p => p.id === playlistId ? updatedPlaylist : p));
    } catch (e) {
      console.error("Failed to remove song from playlist:", e);
    }
  };

  // Find songs inside active playlist
  const activePlaylist = playlists.find(p => p.id === activePlaylistId);
  const activePlaylistSongs = activePlaylist
    ? activePlaylist.songIds
        .map(id => songs.find(s => s.id === id))
        .filter(Boolean) as Song[]
    : [];

  // Get full favorite songs
  const favoriteSongs = favorites
    .map(id => songs.find(s => s.id === id))
    .filter(Boolean) as Song[];

  return (
    <div className="space-y-8" id="playlists-tab-container">
      {/* Playlists Hub Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Create / List Custom Playlists */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex justify-between items-end border-b border-brand-gold/10 pb-2">
            <h3 className="font-display text-lg font-semibold text-[#F5F0E8] flex items-center gap-2">
              <ListPlus className="w-4 h-4 text-brand-gold" />
              <span>Gulistan (Your Playlists)</span>
            </h3>
            <span className="font-urdu text-brand-gold/40 text-xs select-none">گلستان</span>
          </div>

          {/* Form to Create Playlist */}
          <form onSubmit={handleCreatePlaylist} className="flex gap-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Guldasta Name (e.g. Shaam-e-Tanhai)..."
              className="flex-grow bg-[#162520] border border-brand-gold/20 focus:border-brand-gold focus:outline-none rounded-xl px-4 py-2.5 text-brand-cream text-xs placeholder-brand-cream/40"
              id="new-playlist-input"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-gold hover:bg-brand-cream text-brand-charcoal font-medium text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center gap-1 flex-shrink-0"
              id="create-playlist-submit"
            >
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Create</span>
            </button>
          </form>

          {/* Playlists List */}
          {loading ? (
            <div className="flex justify-center py-10">
              <Disc className="w-6 h-6 text-brand-gold animate-spin-slow" />
            </div>
          ) : playlists.length === 0 ? (
            <p className="text-brand-cream/40 text-center py-6 text-xs italic">
              No custom playlists created yet. Create one above!
            </p>
          ) : (
            <div className="space-y-2">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => setActivePlaylistId(playlist.id)}
                  className={`w-full flex justify-between items-center p-3 rounded-xl border text-left transition-all ${
                    activePlaylistId === playlist.id
                      ? "bg-brand-emerald/30 border-brand-gold shadow"
                      : "bg-[#1E2E28]/40 border-brand-gold/10 hover:border-brand-gold/30 hover:bg-brand-emerald/10"
                  }`}
                  id={`playlist-row-item-${playlist.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-brand-charcoal border border-brand-gold/15 flex items-center justify-center text-brand-gold">
                      <Music className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold text-brand-cream text-xs truncate">
                        {playlist.name}
                      </h4>
                      <p className="text-brand-cream/50 text-[10px] mt-0.5">
                        {playlist.songIds?.length || 0} melodies
                      </p>
                    </div>
                  </div>
                  <Calendar className="w-3.5 h-3.5 text-brand-gold/40" />
                </button>
              ))}
            </div>
          )}

          {/* Recently Played History section */}
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-end border-b border-brand-gold/10 pb-1.5">
              <h4 className="font-display text-sm font-semibold text-brand-gold flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                <span>Haal-e-Safar (Recently Played)</span>
              </h4>
              <span className="font-urdu text-brand-gold/30 text-[10px] select-none">حالِ سفر</span>
            </div>
            {recentHistory.length === 0 ? (
              <p className="text-brand-cream/40 text-xs italic">No songs listened to yet in this session.</p>
            ) : (
              <div className="space-y-2">
                {recentHistory.slice(0, 4).map((song) => (
                  <div key={song.id} className="flex gap-2 items-center p-1.5 rounded bg-[#162520] border border-brand-gold/5">
                    <img src={song.thumbnailUrl} alt={song.title} className="w-8 h-8 rounded object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-grow min-w-0">
                      <h5 className="font-display font-medium text-[11px] text-brand-cream truncate">{song.title}</h5>
                      <p className="text-brand-gold/70 text-[9px] truncate">{song.singerName}</p>
                    </div>
                    <button
                      onClick={() => onPlay(song)}
                      className="p-1 text-brand-gold hover:text-brand-cream"
                      id={`history-play-btn-${song.id}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-brand-gold" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Playlist Songs OR Favorites Grid */}
        <div className="lg:col-span-7 space-y-6">
          {activePlaylistId && activePlaylist ? (
            <div className="space-y-4">
              {/* Playlist header */}
              <div className="flex justify-between items-end border-b border-brand-gold/15 pb-2">
                <div>
                  <h3 className="font-display text-xl font-bold text-brand-cream">
                    {activePlaylist.name}
                  </h3>
                  <p className="text-brand-gold/80 text-[10px] mt-0.5">
                    CUSTOM GULDASTA PLAYLIST
                  </p>
                </div>
                <button
                  onClick={() => setActivePlaylistId(null)}
                  className="text-xs text-brand-gold hover:underline"
                  id="view-all-favorites-btn"
                >
                  View Favorites instead
                </button>
              </div>

              {/* Songs List inside active playlist */}
              {activePlaylistSongs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-brand-gold/10 rounded-xl">
                  <p className="text-brand-cream/50 text-xs italic">
                    This playlist is currently empty.
                  </p>
                  <p className="text-brand-gold/70 text-[10px] mt-1">
                    Search for songs or browse collections to add songs!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activePlaylistSongs.map((song, idx) => (
                    <div
                      key={song.id}
                      className={`group flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                        currentSong?.id === song.id
                          ? "bg-brand-emerald/30 border-brand-gold shadow"
                          : "bg-[#1E2E28]/30 border-brand-gold/5 hover:border-brand-gold/30 hover:bg-brand-emerald/10"
                      }`}
                    >
                      <button
                        onClick={() => onPlay(song)}
                        className="w-7 h-7 rounded bg-brand-charcoal border border-brand-gold/15 flex items-center justify-center text-brand-gold hover:bg-brand-gold hover:text-brand-charcoal transition-all"
                        id={`playlist-row-play-${song.id}`}
                      >
                        <Play className="w-3.5 h-3.5 fill-brand-gold hover:fill-brand-charcoal" />
                      </button>

                      <div className="flex-grow min-w-0">
                        <h4 className="font-display font-semibold text-[#F5F0E8] text-xs truncate">
                          {song.title}
                        </h4>
                        <p className="text-brand-gold/70 text-[10px] truncate">{song.singerName}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleFavorite(song.id)}
                          className="text-brand-gold/50 hover:text-brand-gold transition-colors p-1"
                          id={`playlist-row-fav-${song.id}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${favorites.includes(song.id) ? "fill-brand-gold text-brand-gold" : ""}`} />
                        </button>
                        <button
                          onClick={() => handleRemoveFromPlaylist(activePlaylist.id, song.id)}
                          className="text-red-500/60 hover:text-red-500 transition-colors p-1"
                          id={`playlist-row-delete-${song.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Favorites view by default
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-brand-gold/15 pb-2">
                <h3 className="font-display text-lg font-semibold text-[#F5F0E8] flex items-center gap-2">
                  <Heart className="w-4 h-4 text-brand-gold fill-brand-gold" />
                  <span>Pasandeeda Naghme (My Favorites)</span>
                </h3>
                <span className="font-urdu text-brand-gold/40 text-xs select-none">پسندیدہ نغمے</span>
              </div>

              {favoriteSongs.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-brand-gold/10 rounded-xl bg-brand-charcoal/20">
                  <Heart className="w-8 h-8 text-brand-gold/20 mx-auto mb-2" />
                  <p className="text-brand-cream/50 text-xs italic">
                    Your favorites garden has no roses yet.
                  </p>
                  <p className="text-brand-gold/70 text-[10px] mt-1">
                    Click the heart icon on any vintage card to save songs here!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {favoriteSongs.map((song) => (
                    <div
                      key={song.id}
                      className={`flex gap-3 items-center p-2 rounded-xl border transition-all duration-300 ${
                        currentSong?.id === song.id
                          ? "bg-brand-emerald/30 border-brand-gold"
                          : "bg-[#1E2E28]/40 border-brand-gold/5 hover:border-brand-gold/30 hover:bg-brand-emerald/15"
                      }`}
                    >
                      <img src={song.thumbnailUrl} alt={song.title} className="w-12 h-12 rounded object-cover flex-shrink-0 border border-brand-gold/10" referrerPolicy="no-referrer" />
                      <div className="flex-grow min-w-0">
                        <h4 className="font-display font-semibold text-brand-cream text-xs truncate">
                          {song.title}
                        </h4>
                        <p className="text-brand-gold/75 text-[10px] truncate">{song.singerName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onPlay(song)}
                          className="p-1.5 text-brand-gold hover:text-brand-cream transition-transform active:scale-90"
                          id={`fav-row-play-btn-${song.id}`}
                        >
                          <Compass className={`w-4.5 h-4.5 ${currentSong?.id === song.id && isPlaying ? "animate-spin-slow" : ""}`} />
                        </button>
                        <button
                          onClick={() => onToggleFavorite(song.id)}
                          className="p-1.5 text-brand-gold hover:text-brand-cream"
                          id={`fav-row-toggle-btn-${song.id}`}
                        >
                          <Heart className="w-3.5 h-3.5 fill-brand-gold text-brand-gold" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
