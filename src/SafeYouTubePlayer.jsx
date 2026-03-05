import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

// Cargar la API de YouTube IFrame solo una vez
let apiReady = false;
let apiLoadPromise = null;

function loadYouTubeAPI() {
  if (apiReady) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    // Si ya existe el script, esperamos al callback
    if (window.YT && window.YT.Player) {
      apiReady = true;
      resolve();
      return;
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      if (prevCallback) prevCallback();
      resolve();
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });

  return apiLoadPromise;
}

export default function SafeYouTubePlayer({ videoId, onNext, onPrev, hasNext, hasPrev, siblingVideos, onSelectVideo, categoryVideos }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showTray, setShowTray] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  const hideControlsTimer = useRef(null);

  // Swipe support
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Inicializar el reproductor de YouTube
  useEffect(() => {
    let mounted = true;

    loadYouTubeAPI().then(() => {
      if (!mounted || !containerRef.current) return;

      // Crear un div hijo para el player
      const playerDiv = document.createElement('div');
      playerDiv.id = `yt-player-${videoId}-${Date.now()}`;
      containerRef.current.querySelector('.yt-player-slot')?.replaceChildren(playerDiv);

      playerRef.current = new window.YT.Player(playerDiv.id, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,        // Sin controles nativos de YouTube
          disablekb: 1,       // Deshabilitar atajos de teclado
          fs: 0,              // Sin botón fullscreen nativo
          iv_load_policy: 3,  // Sin anotaciones
          modestbranding: 1,  // Minimizar branding
          rel: 0,             // Sin videos relacionados al final
          showinfo: 0,        // Sin info del video
          playsinline: 1,     // Reproducir inline en móvil
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (!mounted) return;
            setPlayerReady(true);
            setDuration(event.target.getDuration());
            setIsPlaying(true);
            setHasEnded(false);
          },
          onStateChange: (event) => {
            if (!mounted) return;
            const state = event.data;
            // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0, BUFFERING=3
            setIsPlaying(state === 1);
            setHasEnded(state === 0);
            if (state === 1) {
              setDuration(event.target.getDuration());
            }
          },
        },
      });
    });

    return () => {
      mounted = false;
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Actualizar progreso
  useEffect(() => {
    if (playerReady && isPlaying) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          const t = playerRef.current.getCurrentTime();
          const d = playerRef.current.getDuration();
          setCurrentTime(t);
          setDuration(d);
          setProgress(d > 0 ? (t / d) * 100 : 0);
        }
      }, 500);
    }
    return () => clearInterval(intervalRef.current);
  }, [playerReady, isPlaying]);

  // Escuchar cambios de fullscreen
  useEffect(() => {
    const handler = () => {
      const inFs = !!document.fullscreenElement || !!document.webkitFullscreenElement;
      setIsFullscreen(inFs);
      if (!inFs) setCssFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  // Bloquear scroll del body en CSS fullscreen (mòbil)
  useEffect(() => {
    if (cssFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [cssFullscreen]);

  // Auto-hide de controles
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    clearTimeout(hideControlsTimer.current);
    if (isPlaying && !hasEnded) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, hasEnded]);

  // Controles
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (hasEnded) {
      playerRef.current.seekTo(0, true);
      playerRef.current.playVideo();
      setHasEnded(false);
    } else if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
    } else {
      playerRef.current.mute();
    }
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    const inFs = !!document.fullscreenElement || !!document.webkitFullscreenElement || cssFullscreen;
    if (inFs) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      setCssFullscreen(false);
      setIsFullscreen(false);
    } else {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        req.call(el).catch(() => setCssFullscreen(true));
      } else {
        // iOS Safari fallback: CSS fullscreen
        setCssFullscreen(true);
        setIsFullscreen(true);
      }
    }
  };

  const handleSeek = (e) => {
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const seekTime = pct * duration;
    playerRef.current.seekTo(seekTime, true);
    setCurrentTime(seekTime);
    setProgress(pct * 100);
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    resetHideTimer();
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Solo swipe horizontal (más horizontal que vertical, y mínimo 60px)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && hasNext) onNext();
      if (dx > 0 && hasPrev) onPrev();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black group select-none ${
        cssFullscreen
          ? 'fixed inset-0 z-[99999] overflow-hidden'
          : 'aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white'
      }`}
      onMouseMove={resetHideTimer}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slot del player de YouTube (oculto detrás de la overlay) */}
      <style>{`
        .yt-player-slot iframe {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        .yt-tray-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="yt-player-slot absolute inset-0 w-full h-full pointer-events-none">
        <div />
      </div>

      {/* OVERLAY BLOQUEANTE: captura TODOS los clics para evitar acceso a YouTube */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!hasEnded) {
            togglePlay();
            resetHideTimer();
          }
        }}
      />

      {/* Flechas laterales para cambiar de video */}
      {showControls && hasPrev && !hasEnded && (
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 md:p-3 transition-all hover:scale-110 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          style={{ pointerEvents: 'auto' }}
        >
          <ChevronLeft size={28} />
        </button>
      )}
      {showControls && hasNext && !hasEnded && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 md:p-3 transition-all hover:scale-110 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          style={{ pointerEvents: 'auto' }}
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Pantalla de fin: muestra los videos del niño */}
      {hasEnded && siblingVideos && siblingVideos.length > 0 && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <h3 className="text-white text-xl md:text-2xl font-bold mb-4">Continua veient!</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl w-full max-h-[70%] overflow-y-auto p-2">
            {siblingVideos.map(video => (
              <button
                key={video.id}
                className="group flex flex-col bg-white/10 hover:bg-white/20 rounded-xl overflow-hidden transition-all hover:scale-105"
                onClick={(e) => { e.stopPropagation(); onSelectVideo(video); }}
              >
                <div className="relative w-full aspect-video">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                    <Play size={24} className="text-white drop-shadow-lg" fill="white" />
                  </div>
                </div>
                <span className="text-white text-xs font-bold p-2 line-clamp-2 text-left leading-tight">{video.title}</span>
              </button>
            ))}
          </div>
          <button
            className="mt-4 flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay(); // Volver a reproducir el actual
            }}
          >
            <RotateCcw size={16} /> Tornar a veure este vídeo
          </button>
        </div>
      )}

      {/* Icono de play/pause central */}
      {showControls && playerReady && !hasEnded && !isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-300">
          <div className="bg-black/60 rounded-full p-5 backdrop-blur-sm">
            <Play size={48} className="text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Video tray: vídeos de la mateixa temàtica en fullscreen */}
      {(isFullscreen || cssFullscreen) && showTray && !hasEnded && categoryVideos && categoryVideos.length > 0 && (
        <div
          className="absolute bottom-[4.5rem] left-0 right-0 z-20 px-4 pb-1"
          onMouseEnter={() => setShowTray(true)}
          onMouseLeave={() => setShowTray(false)}
          style={{ pointerEvents: 'auto' }}
        >
          <p className="text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Més vídeos</p>
          <div className="yt-tray-scroll flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <style>{`.tray-scroll::-webkit-scrollbar { display: none; }`}</style>
            {categoryVideos.map(video => (
              <button
                key={video.id}
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => { e.stopPropagation(); onSelectVideo(video); }}
                className="flex-shrink-0 group/v flex flex-col bg-black/60 hover:bg-black/80 rounded-xl overflow-hidden transition-all w-36 backdrop-blur-sm border border-white/10"
              >
                <div className="relative w-full aspect-video">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover/v:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play size={18} className="text-white drop-shadow-lg" fill="white" />
                  </div>
                </div>
                <span className="text-white text-[11px] font-semibold p-1.5 line-clamp-2 text-left leading-tight">{video.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra de controles inferior */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        onMouseEnter={() => { if (isFullscreen || cssFullscreen) setShowTray(true); }}
        onMouseLeave={() => setShowTray(false)}
      >
        {/* Gradiente de fondo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        <div className="relative px-4 pb-3 pt-8">
          {/* Barra de progreso */}
          <div
            className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-3 group/bar hover:h-3 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              handleSeek(e);
            }}
            style={{ pointerEvents: 'auto' }}
          >
            <div
              className="h-full bg-red-500 rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity shadow-lg" />
            </div>
          </div>

          {/* Botones de control */}
          <div className="flex items-center gap-2 md:gap-3 text-white">
            {/* Anterior */}
            {hasPrev && (
              <button
                onClick={(e) => { e.stopPropagation(); onPrev(); }}
                className="hover:scale-110 transition-transform p-1"
                style={{ pointerEvents: 'auto' }}
              >
                <ChevronLeft size={22} />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="hover:scale-110 transition-transform p-1"
              style={{ pointerEvents: 'auto' }}
            >
              {hasEnded ? (
                <RotateCcw size={24} />
              ) : isPlaying ? (
                <Pause size={24} fill="white" />
              ) : (
                <Play size={24} fill="white" />
              )}
            </button>

            {/* Siguiente */}
            {hasNext && (
              <button
                onClick={(e) => { e.stopPropagation(); onNext(); }}
                className="hover:scale-110 transition-transform p-1"
                style={{ pointerEvents: 'auto' }}
              >
                <ChevronRight size={22} />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="hover:scale-110 transition-transform p-1"
              style={{ pointerEvents: 'auto' }}
            >
              {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>

            <span className="text-sm font-mono tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="hover:scale-110 transition-transform p-1"
              style={{ pointerEvents: 'auto' }}
            >
              {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
