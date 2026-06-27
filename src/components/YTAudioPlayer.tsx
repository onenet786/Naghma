import React, { useEffect, useRef, useState } from "react";
import { Song } from "../types";

interface YTAudioPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number; // 0 to 100
  isMuted: boolean;
  playbackRate: number;
  onStateChange: (state: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isBuffering: boolean;
  }) => void;
  onEnded: () => void;
  onError?: (message: string) => void;
  showVideo: boolean;
}

// Global script load tracker
let apiLoaded = false;

export default function YTAudioPlayer({
  currentSong,
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  onStateChange,
  onEnded,
  onError,
  showVideo
}: YTAudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const timeIntervalRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // 1. Load YouTube Iframe API if not loaded
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onAPIReady = () => {
      setIsReady(true);
    };

    if ((window as any).YT && (window as any).YT.Player) {
      setIsReady(true);
    } else {
      // Bind callback
      const prevCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        onAPIReady();
      };

      if (!apiLoaded) {
        apiLoaded = true;
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
    }
  }, []);

  // 2. Instantiate or update YouTube Player when ready or song changes
  useEffect(() => {
    if (!isReady || !currentSong || !containerRef.current) return;

    // Destroy existing player if it exists
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.error("Error destroying YT player:", e);
      }
      playerRef.current = null;
    }

    // Create unique ID for iframe container
    const playerId = "yt-player-element";
    const el = document.getElementById(playerId);
    if (!el) {
      const newEl = document.createElement("div");
      newEl.id = playerId;
      containerRef.current.appendChild(newEl);
    }

    playerRef.current = new (window as any).YT.Player(playerId, {
      host: "https://www.youtube-nocookie.com",
      videoId: currentSong.youtubeId,
      playerVars: {
        autoplay: isPlaying ? 1 : 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        origin: window.location.origin
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(isMuted ? 0 : volume);
          if (isPlaying) {
            event.target.playVideo();
          }
          // Notify initial state
          const duration = event.target.getDuration() || 180;
          onStateChange({
            isPlaying,
            currentTime: 0,
            duration,
            isBuffering: false
          });
        },
        onStateChange: (event: any) => {
          const ytState = event.data;
          const YT_STATES = (window as any).YT.PlayerState;
          
          const playing = ytState === YT_STATES.PLAYING;
          const buffering = ytState === YT_STATES.BUFFERING;
          const duration = playerRef.current?.getDuration() || 0;
          const currentTime = playerRef.current?.getCurrentTime() || 0;

          onStateChange({
            isPlaying: playing,
            currentTime,
            duration,
            isBuffering: buffering
          });

          if (ytState === YT_STATES.ENDED) {
            onEnded();
          }
        },
        onError: (e: any) => {
          console.error("YouTube Player Error Code:", e.data);
          let reason = "This recording is currently unavailable or restricted by the publisher.";
          if (e.data === 2) reason = "Invalid video parameter request.";
          if (e.data === 5) reason = "HTML5 playback error occurred.";
          if (e.data === 100) reason = "The requested vintage video was not found.";
          if (e.data === 101 || e.data === 150) reason = "Embedded playback has been restricted by its publisher.";
          
          if (onError) {
            onError(reason);
          }
          // Handle error gracefully by moving to next track
          onEnded();
        }
      }
    });

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, [isReady, currentSong?.youtubeId]);

  // 3. Keep track of current time while playing
  useEffect(() => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
    }

    if (isPlaying) {
      timeIntervalRef.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
          try {
            const currentTime = playerRef.current.getCurrentTime();
            const duration = playerRef.current.getDuration();
            onStateChange({
              isPlaying: true,
              currentTime,
              duration,
              isBuffering: false
            });
          } catch (e) {
            // Ignore temporary exceptions before player load completes
          }
        }
      }, 500);
    }

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, [isPlaying]);

  // 4. Update Volume and Mute states
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === "function") {
      try {
        playerRef.current.setVolume(isMuted ? 0 : volume);
      } catch (e) {
        // Safe catch
      }
    }
  }, [volume, isMuted]);

  // 5. Update Play/Pause state from external controls
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        if (typeof playerRef.current.playVideo === "function") {
          playerRef.current.playVideo();
        }
      } else {
        if (typeof playerRef.current.pauseVideo === "function") {
          playerRef.current.pauseVideo();
        }
      }
    } catch (e) {
      // Safe catch
    }
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden bg-brand-charcoal transition-all duration-300 ${
        showVideo 
          ? "w-full aspect-video border border-brand-gold/30 shadow-2xl" 
          : "w-[1px] h-[1px] opacity-0 pointer-events-none absolute"
      }`}
      style={{ minHeight: showVideo ? "200px" : "1px" }}
    >
      <div id="yt-player-element" className="w-full h-full" />
      {showVideo && (
        <div className="absolute top-2 right-2 bg-brand-charcoal/80 border border-brand-gold/30 px-2 py-0.5 rounded text-[10px] font-mono text-brand-gold uppercase tracking-wider">
          Vintage Feed (Lollywood/PTV Archive)
        </div>
      )}
    </div>
  );
}
