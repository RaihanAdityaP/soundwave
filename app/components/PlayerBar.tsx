'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX, Mic2 } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import LyricsFullscreen from './LyricsFullscreen'

function formatTime(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlayerBar() {
  const {
    currentTrack, isPlaying, volume, progress,
    setIsPlaying, setVolume, setProgress,
    playNext, playPrev, setLyrics,
    setSeekTo, setResolving, resolving,
  } = usePlayerStore()

  const ytPlayerRef = useRef<any>(null)
  const [ytReady, setYtReady] = useState(false)
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [showFullscreenLyrics, setShowFullscreenLyrics] = useState(false)
  const [prevVolume, setPrevVolume] = useState(0.8)
  const [showVolumePct, setShowVolumePct] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playNextRef = useRef(playNext)
  const setIsPlayingRef = useRef(setIsPlaying)

  useEffect(() => { playNextRef.current = playNext }, [playNext])
  useEffect(() => { setIsPlayingRef.current = setIsPlaying }, [setIsPlaying])

  // ── YouTube IFrame API ──────────────────────────────────────────────────
  useEffect(() => {
    if ((window as any).YT?.Player) { setYtReady(true); return }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    ;(window as any).onYouTubeIframeAPIReady = () => setYtReady(true)
  }, [])

  // ── Load track ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return

    setProgress(0)

    fetch(`/api/lyrics?title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist)}&duration=${currentTrack.duration}`)
      .then(r => r.json())
      .then(setLyrics)
      .catch(() => {})

    if (currentTrack.source === 'youtube') {
      setResolving(false)
      setResolvedId(currentTrack.url ?? null)
    } else if (currentTrack.source === 'deezer') {
      setResolving(true)
      const query = currentTrack.youtubeQuery || `${currentTrack.title} ${currentTrack.artist}`
      fetch(`/api/resolve?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(({ id }) => {
          setResolvedId(id)
          setResolving(false)
        })
        .catch(() => setResolving(false))
    }
  }, [currentTrack?.id])

  // ── Media Session API ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist ?? '',
      artwork: currentTrack.thumbnail
        ? [{ src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    })

    navigator.mediaSession.setActionHandler('play', () => {
      ytPlayerRef.current?.playVideo()
      setIsPlayingRef.current(true)
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      ytPlayerRef.current?.pauseVideo()
      setIsPlayingRef.current(false)
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      usePlayerStore.getState().playPrev()
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNextRef.current()
    })
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(details.seekTime, true)
      }
    })

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('seekto', null)
    }
  }, [currentTrack])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  // ── Visibility change ──────────────────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isPlaying && ytPlayerRef.current?.getPlayerState) {
        const state = ytPlayerRef.current.getPlayerState()
        if (state === 2 || state === 5) {
          ytPlayerRef.current.playVideo()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isPlaying])

  // ── Init / load YouTube player ─────────────────────────────────────────
  useEffect(() => {
    if (!resolvedId || !ytReady) return

    if (!ytPlayerRef.current) {
      ytPlayerRef.current = new (window as any).YT.Player('yt-player', {
        height: '0',
        width: '0',
        videoId: resolvedId,
        playerVars: { autoplay: 1, playsinline: 1 },
        events: {
          onReady: () => {
            setSeekTo((seconds: number) => {
              ytPlayerRef.current?.seekTo(seconds, true)
            })
          },
          onStateChange: (e: any) => {
            if (e.data === 0) playNextRef.current()
            if (e.data === 1) setIsPlayingRef.current(true)
            if (e.data === 2) setIsPlayingRef.current(false)
          },
        },
      })
    } else {
      ytPlayerRef.current.loadVideoById(resolvedId)
      setSeekTo((seconds: number) => {
        ytPlayerRef.current?.seekTo(seconds, true)
      })
    }
  }, [resolvedId, ytReady])

  useEffect(() => {
    if (!ytPlayerRef.current?.playVideo) return
    isPlaying ? ytPlayerRef.current.playVideo() : ytPlayerRef.current.pauseVideo()
  }, [isPlaying])

  useEffect(() => {
    if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(volume * 100)
  }, [volume])

  // ── Progress interval ──────────────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!currentTrack) return

    intervalRef.current = setInterval(() => {
      const player = ytPlayerRef.current
      if (!player?.getCurrentTime) return
      const currentTime = player.getCurrentTime()
      const duration = player.getDuration?.() || currentTrack.duration
      if (duration > 0) {
        const progress = currentTime / duration
        setProgress(progress)

        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
          try {
            navigator.mediaSession.setPositionState({
              duration,
              playbackRate: 1,
              position: currentTime,
            })
          } catch {}
        }
      }
    }, 500)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [currentTrack?.id])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setProgress(val)
    const player = ytPlayerRef.current
    if (player?.seekTo && currentTrack) {
      const duration = player.getDuration?.() || currentTrack.duration
      player.seekTo(val * duration, true)
    }
  }

  const handleMuteToggle = () => {
    if (volume > 0) {
      setPrevVolume(volume)
      setVolume(0)
    } else {
      setVolume(prevVolume || 0.8)
    }
  }

  if (!currentTrack) return null

  const duration = ytPlayerRef.current?.getDuration?.() || currentTrack.duration
  const safeProgress = isNaN(progress) || !isFinite(progress) ? 0 : progress
  const currentSeconds = Math.floor(safeProgress * duration)
  const volumePct = Math.round(volume * 100)

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <>
      {showFullscreenLyrics && (
        <LyricsFullscreen onClose={() => setShowFullscreenLyrics(false)} />
      )}

      {/* Desktop player */}
      <div className="hidden md:flex h-20 bg-zinc-900 border-t border-zinc-800 px-6 items-center gap-6 shrink-0">
        <div id="yt-player" className="hidden" />

        <button
          className="flex items-center gap-3 w-56 shrink-0 group text-left"
          onClick={() => setShowFullscreenLyrics(true)}
          title="Open lyrics"
        >
          <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden">
            <Image src={currentTrack.thumbnail} alt="" fill className="object-cover" />
            {/* Loading shimmer overlay on album art in player bar */}
            {resolving && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!resolving && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Mic2 size={16} className="text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition-colors">
              {currentTrack.title}
            </p>
            <p className={`text-xs truncate ${resolving ? 'text-green-400 animate-pulse' : 'text-zinc-400'}`}>
              {resolving ? 'Memuat lagu…' : currentTrack.artist}
            </p>
          </div>
        </button>

        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button onClick={playPrev} className="text-zinc-400 hover:text-white transition-colors">
              <SkipBack size={20} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={resolving}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
            >
              {resolving
                ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                : isPlaying
                  ? <Pause size={18} className="text-black fill-black" />
                  : <Play size={18} className="text-black fill-black ml-0.5" />
              }
            </button>
            <button onClick={playNext} className="text-zinc-400 hover:text-white transition-colors">
              <SkipForward size={20} />
            </button>
          </div>

          <div className="w-full max-w-md flex items-center gap-2">
            <span className="text-zinc-500 text-xs w-8 text-right tabular-nums">
              {formatTime(currentSeconds)}
            </span>
            <div className="relative flex-1 h-1 group cursor-pointer">
              <div className="absolute inset-0 bg-zinc-600 rounded-full" />
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-colors pointer-events-none ${
                  resolving ? 'bg-zinc-500 animate-pulse' : 'bg-white group-hover:bg-green-500'
                }`}
                style={{ width: `${Math.min(safeProgress * 100, 100)}%` }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={safeProgress}
                onChange={handleSeek}
                disabled={resolving}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
            <span className="text-zinc-500 text-xs w-8 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-56 justify-end">
          <button
            onClick={() => setShowFullscreenLyrics(true)}
            className="text-zinc-400 hover:text-white transition-colors"
            title="Open lyrics fullscreen"
          >
            <Mic2 size={18} />
          </button>

          <div
            className="flex items-center gap-2"
            onMouseEnter={() => setShowVolumePct(true)}
            onMouseLeave={() => setShowVolumePct(false)}
          >
            <button
              onClick={handleMuteToggle}
              className="text-zinc-400 hover:text-white transition-colors shrink-0"
            >
              <VolumeIcon size={18} />
            </button>

            <div className="relative w-24 flex items-center group">
              <div className="absolute inset-y-0 my-auto h-1 w-full bg-zinc-600 rounded-full" />
              <div
                className="absolute inset-y-0 my-auto h-1 bg-green-500 rounded-full pointer-events-none transition-all"
                style={{ width: `${volumePct}%` }}
              />
              <div
                className="absolute w-3 h-3 bg-white rounded-full shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
                style={{ left: `${volumePct}%` }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="relative w-full h-4 opacity-0 cursor-pointer z-10"
              />
            </div>

            <span
              className={`text-zinc-400 text-xs tabular-nums w-7 text-right transition-opacity duration-150 ${
                showVolumePct ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {volumePct}%
            </span>
          </div>
        </div>
      </div>

      {/* Mobile player */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-zinc-800/95 backdrop-blur-md border-t border-zinc-700/50 px-3 py-2">
        <div id="yt-player-mobile" className="hidden" />

        {/* Progress bar — pulse while resolving */}
        <div className="relative h-0.5 w-full mb-2 rounded-full overflow-hidden bg-zinc-700">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${
              resolving ? 'bg-zinc-500 animate-pulse w-full' : 'bg-green-500'
            }`}
            style={resolving ? {} : { width: `${Math.min(safeProgress * 100, 100)}%` }}
          />
          {!resolving && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={safeProgress}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
            onClick={() => setShowFullscreenLyrics(true)}
          >
            <div className="relative w-10 h-10 shrink-0 rounded overflow-hidden">
              <Image src={currentTrack.thumbnail} alt="" fill className="object-cover" />
              {resolving && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded">
                  <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate leading-tight">
                {currentTrack.title}
              </p>
              <p className={`text-xs truncate ${resolving ? 'text-green-400 animate-pulse' : 'text-zinc-400'}`}>
                {resolving ? 'Memuat lagu…' : currentTrack.artist}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={playPrev} className="text-zinc-400 p-2">
              <SkipBack size={18} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={resolving}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center disabled:opacity-50"
            >
              {resolving
                ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                : isPlaying
                  ? <Pause size={17} className="text-black fill-black" />
                  : <Play size={17} className="text-black fill-black ml-0.5" />
              }
            </button>
            <button onClick={playNext} className="text-zinc-400 p-2">
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}