import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCw,
  Tv,
  Settings,
  AlertCircle,
  CheckCircle2,
  Radio,
  Camera,
  Activity,
  Layers,
  Volume1
} from 'lucide-react';

interface HlsPlayerProps {
  src: string;
  originalUrl?: string;
  autoPlay?: boolean;
  muted?: boolean;
  title?: string;
  isEmbed?: boolean;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({
  src,
  originalUrl,
  autoPlay = true,
  muted = true,
  title,
  isEmbed = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(muted);
  const [volume, setVolume] = useState<number>(muted ? 0 : 0.8);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPiP, setIsPiP] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [levels, setLevels] = useState<Array<{ id: number; height: number; bitrate: number; name: string }>>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [audioTracks, setAudioTracks] = useState<Array<{ id: number; name: string; lang?: string }>>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [liveLatency, setLiveLatency] = useState<number>(0);
  const [bufferLen, setBufferLen] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [codecInfo, setCodecInfo] = useState<{ video?: string; audio?: string }>({
    video: 'H264 / AVC',
    audio: 'MPEG Audio (mpga/mp3)',
  });
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and load stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setIsLoading(true);
    setErrorMsg(null);

    // Destroy existing instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      // Configure Hls.js with high compatibility for H264 and MPGA/MP3 audio
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        progressive: true,
        enableSoftwareAES: true,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 4,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 5,
        testBandwidth: true,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });

      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        const parsedLevels = data.levels.map((lvl, index) => ({
          id: index,
          height: lvl.height || 0,
          bitrate: lvl.bitrate || 0,
          name: lvl.height ? `${lvl.height}p` : `Stream ${index + 1}`,
        }));
        setLevels(parsedLevels);
        setCurrentLevel(hls.currentLevel);

        if (data.audioTracks && data.audioTracks.length > 0) {
          setAudioTracks(data.audioTracks.map((t, idx) => ({ id: idx, name: t.name || `Audio ${idx + 1}`, lang: t.lang })));
          setCurrentAudioTrack(hls.audioTrack);
        }

        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay with audio was blocked by browser policy, fallback to muted
            video.muted = true;
            setIsMuted(true);
            video.play().catch((e) => console.warn('Autoplay blocked:', e));
          });
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        setCurrentAudioTrack(data.id);
      });

      hls.on(Hls.Events.FRAG_PARSING_METADATA, (_, data) => {
        // Detected media metadata
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn('[Hls Player Error]', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMsg(`Network Error: ${data.details}. Attempting recovery...`);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMsg(`Media/Codec Error: ${data.details}. Recovering decoder...`);
              hls.recoverMediaError();
              break;
            default:
              setErrorMsg(`Playback failed (${data.details}). Please verify upstream HTTP server.`);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple Safari HLS support
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(console.warn);
          });
        }
      });
      video.addEventListener('error', () => {
        setErrorMsg('Native player error loading stream.');
      });
    } else {
      setErrorMsg('Your browser does not support HLS streaming.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  // Track live latency and buffer health
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      const hls = hlsRef.current;
      if (!video) return;

      if (hls && hls.liveSyncPosition) {
        const latency = Math.max(0, hls.liveSyncPosition - video.currentTime);
        setLiveLatency(+latency.toFixed(1));
      }

      if (video.buffered && video.buffered.length > 0) {
        for (let i = 0; i < video.buffered.length; i++) {
          if (video.currentTime >= video.buffered.start(i) && video.currentTime <= video.buffered.end(i)) {
            setBufferLen(+(video.buffered.end(i) - video.currentTime).toFixed(1));
            break;
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(console.warn);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.muted = false;
      video.volume = volume > 0 ? volume : 0.8;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;

    setVolume(val);
    video.volume = val;
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen?.().catch(console.warn);
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.().catch(console.warn);
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        await video.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (e) {
      console.warn('PiP not supported or failed', e);
    }
  };

  const reloadStream = () => {
    setIsLoading(true);
    setErrorMsg(null);
    if (hlsRef.current) {
      hlsRef.current.loadSource(src);
      hlsRef.current.startLoad();
    } else if (videoRef.current) {
      videoRef.current.src = src;
      videoRef.current.load();
    }
  };

  const changeQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentLevel(levelIndex);
      setShowSettings(false);
    }
  };

  const changeAudioTrack = (trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
      setCurrentAudioTrack(trackId);
      setShowSettings(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
      }
    }, 3500);
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `stream_snapshot_${Date.now()}.png`;
      a.click();
    }
  };

  return (
    <div
      ref={containerRef}
      id="hls-player-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative w-full overflow-hidden bg-slate-950 font-sans select-none flex flex-col items-center justify-center ${
        isEmbed ? 'h-screen' : 'rounded-2xl shadow-2xl aspect-video border border-slate-800'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        id="hls-main-video"
        playsInline
        webkit-playsinline="true"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Loading Spinner */}
      {isLoading && !errorMsg && (
        <div id="player-loading-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs z-20 pointer-events-none">
          <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
          <p className="text-emerald-400 text-xs font-mono tracking-wider">CONNECTING HTTPS PROXY...</p>
        </div>
      )}

      {/* Error Overlay */}
      {errorMsg && (
        <div id="player-error-overlay" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center z-30">
          <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
          <h4 className="text-white font-semibold text-sm mb-1">Stream Error</h4>
          <p className="text-slate-400 text-xs max-w-md mb-4 font-mono leading-relaxed">{errorMsg}</p>
          <div className="flex gap-2">
            <button
              id="btn-retry-stream"
              onClick={reloadStream}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" /> Reconnect
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div
        id="player-top-header"
        className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>HTTPS PROXY LIVE</span>
          </div>
          {title && <span className="text-white text-sm font-medium truncate max-w-xs">{title}</span>}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 text-slate-300 font-mono">
            <span className="text-slate-400">Video:</span>
            <span className="text-emerald-400 font-semibold">{codecInfo.video}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 text-slate-300 font-mono">
            <span className="text-slate-400">Audio:</span>
            <span className="text-sky-400 font-semibold">{codecInfo.audio}</span>
          </div>
        </div>
      </div>

      {/* Settings Flyout */}
      {showSettings && (
        <div
          id="player-settings-popup"
          className="absolute bottom-16 right-4 w-64 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md p-3 text-white text-xs z-30 animate-in fade-in zoom-in-95"
        >
          <div className="font-semibold text-slate-300 pb-2 border-b border-slate-800 mb-2 flex items-center justify-between">
            <span>Stream Configuration</span>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
          </div>

          {levels.length > 0 && (
            <div className="mb-3">
              <label className="text-slate-400 block mb-1 font-medium">Quality Bitrate</label>
              <div className="space-y-1">
                <button
                  onClick={() => changeQuality(-1)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer ${
                    currentLevel === -1 ? 'bg-emerald-600/30 text-emerald-400 font-medium' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>Auto Adaptive</span>
                  {currentLevel === -1 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                {levels.map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => changeQuality(lvl.id)}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer ${
                      currentLevel === lvl.id ? 'bg-emerald-600/30 text-emerald-400 font-medium' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{lvl.name} {lvl.bitrate ? `(${(lvl.bitrate / 1000).toFixed(0)} kbps)` : ''}</span>
                    {currentLevel === lvl.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {audioTracks.length > 1 && (
            <div className="mb-2">
              <label className="text-slate-400 block mb-1 font-medium">Audio Track</label>
              <div className="space-y-1">
                {audioTracks.map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => changeAudioTrack(tr.id)}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer ${
                      currentAudioTrack === tr.id ? 'bg-emerald-600/30 text-emerald-400 font-medium' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{tr.name}</span>
                    {currentAudioTrack === tr.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 text-slate-400 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span>Live Latency:</span>
              <span className="text-slate-200">{liveLatency}s</span>
            </div>
            <div className="flex justify-between">
              <span>Buffer Ahead:</span>
              <span className="text-slate-200">{bufferLen}s</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        id="player-bottom-controls"
        className={`absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent flex flex-col gap-2 transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-3 text-white">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <button
              id="btn-player-play-toggle"
              onClick={togglePlay}
              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group">
              <button
                id="btn-player-mute-toggle"
                onClick={toggleMute}
                className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                id="player-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Live Indicator */}
            <div className="hidden xs:flex items-center gap-1.5 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-emerald-400">LIVE</span>
              {liveLatency > 0 && <span className="text-slate-400 text-[11px]">(-{liveLatency}s)</span>}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="btn-player-reload"
              onClick={reloadStream}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
              title="Resync / Reload Stream"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              id="btn-player-snapshot"
              onClick={takeSnapshot}
              className="hidden sm:inline-flex p-1.5 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
              title="Take Frame Snapshot"
            >
              <Camera className="w-4 h-4" />
            </button>

            {document.pictureInPictureEnabled && (
              <button
                id="btn-player-pip"
                onClick={togglePiP}
                className="hidden sm:inline-flex p-1.5 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
                title="Picture-in-Picture"
              >
                <Tv className="w-4 h-4" />
              </button>
            )}

            <button
              id="btn-player-settings"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                showSettings ? 'text-emerald-400 bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Quality & Audio Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              id="btn-player-fullscreen"
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
