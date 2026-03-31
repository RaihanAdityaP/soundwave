'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Play, Pause, SkipBack, SkipForward, Volume2, Mic2 } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'

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
    playNext, playPrev, toggleLyrics, setLyrics,
    setSeekTo,
  } = usePlayerStore()

  const ytPlayerRef = useRef<any>(null)
  const [ytReady, setYtReady] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // ref untuk playNext supaya closure di onStateChange selalu dapat versi terbaru
  const playNextRef = useRef(playNext)
  const setIsPlayingRef = useRef(setIsPlaying)

  useEffect(() => { playNextRef.current = playNext }, [playNext])
  useEffect(() => { setIsPlayingRef.current = setIsPlaying }, [setIsPlaying])

  // Load YouTube IFrame API once
  useEffect(() => {
    if ((window as any).YT?.Player) { setYtReady(true); return }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    ;(window as any).onYouTubeIframeAPIReady = () => setYtReady(true)
  }, [])

  // When track changes: resolve YouTube ID + fetch lyrics
  useEffect(() => {
    if (!currentTrack) return

    setProgress(0)

    fetch(`/api/lyrics?title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist)}`)
      .then(r => r.json())
      .then(setLyrics)
      .catch(() => {})

    if (currentTrack.source === 'youtube') {
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

  // Load / swap video
  useEffect(() => {
  if (!resolvedId || !ytReady) return

  if (!ytPlayerRef.current) {
    ytPlayerRef.current = new (window as any).YT.Player('yt-player', {
      height: '0',
      width: '0',
      videoId: resolvedId,
      playerVars: { autoplay: 1 },
      events: {
        onReady: () => {
          // register seekTo ke store saat player siap
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

    // update juga kalau video diganti
    setSeekTo((seconds: number) => {
      ytPlayerRef.current?.seekTo(seconds, true)
    })
  }
}, [resolvedId, ytReady])

  // Play / pause sync
  useEffect(() => {
    if (!ytPlayerRef.current?.playVideo) return
    isPlaying ? ytPlayerRef.current.playVideo() : ytPlayerRef.current.pauseVideo()
  }, [isPlaying])

  // Volume sync
  useEffect(() => {
    if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(volume * 100)
  }, [volume])

  // Progress tracking
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!currentTrack) return

    intervalRef.current = setInterval(() => {
      const player = ytPlayerRef.current
      if (!player?.getCurrentTime) return
      const currentTime = player.getCurrentTime()
      const duration = player.getDuration?.() || currentTrack.duration
      if (duration > 0) setProgress(currentTime / duration)
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

  if (!currentTrack) return null

  const duration = ytPlayerRef.current?.getDuration?.() || currentTrack.duration
  const currentSeconds = Math.floor(progress * duration)

  return (
    <div className="h-20 bg-zinc-900 border-t border-zinc-800 px-6 flex items-center gap-6 shrink-0">
      <div id="yt-player" className="hidden" />

      {/* Track info */}
      <div className="flex items-center gap-3 w-56 shrink-0">
        <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden">
          <Image src={currentTrack.thumbnail} alt="" fill className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{currentTrack.title}</p>
          <p className="text-zinc-400 text-xs truncate">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Controls */}
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

        {/* Progress bar */}
        <div className="w-full max-w-md flex items-center gap-2">
          <span className="text-zinc-500 text-xs w-8 text-right tabular-nums">
            {formatTime(currentSeconds)}
          </span>
          <div className="relative flex-1 h-1 group cursor-pointer">
            <div className="absolute inset-0 bg-zinc-600 rounded-full" />
            <div
              className="absolute inset-y-0 left-0 bg-white group-hover:bg-green-500 rounded-full transition-colors pointer-events-none"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-zinc-500 text-xs w-8 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 w-56 justify-end">
        <button onClick={toggleLyrics} className="text-zinc-400 hover:text-white transition-colors" title="Lyrics">
          <Mic2 size={18} />
        </button>
        <Volume2 size={18} className="text-zinc-400 shrink-0" />
        <input
          type="range" min={0} max={1} step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-24 h-1 accent-green-500 cursor-pointer"
        />
      </div>
    </div>
  )
}