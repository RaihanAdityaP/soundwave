'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Play, Pause, SkipBack, SkipForward, Volume2, Mic2 } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlayerBar() {
  const {
    currentTrack, isPlaying, volume, progress,
    setIsPlaying, setVolume, setProgress,
    playNext, playPrev, toggleLyrics, setLyrics,
  } = usePlayerStore()

  const ytPlayerRef = useRef<any>(null)
  const [ytReady, setYtReady] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolvedId, setResolvedId] = useState<string | null>(null)

  // Load YouTube IFrame API once
  useEffect(() => {
    if ((window as any).YT?.Player) { setYtReady(true); return }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    ;(window as any).onYouTubeIframeAPIReady = () => setYtReady(true)
  }, [])

  // When track changes: resolve YouTube ID if needed, fetch lyrics
  useEffect(() => {
    if (!currentTrack) return

    // Fetch lyrics in background
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

  // Load video once resolvedId is ready
  useEffect(() => {
    if (!resolvedId || !ytReady) return

    if (!ytPlayerRef.current) {
      ytPlayerRef.current = new (window as any).YT.Player('yt-player', {
        height: '0',
        width: '0',
        videoId: resolvedId,
        playerVars: { autoplay: 1 },
        events: {
          onStateChange: (e: any) => {
            if (e.data === 0) playNext() // ended
          },
        },
      })
    } else {
      ytPlayerRef.current.loadVideoById(resolvedId)
    }
  }, [resolvedId, ytReady])

  // Play / pause
  useEffect(() => {
    if (!ytPlayerRef.current?.playVideo) return
    isPlaying ? ytPlayerRef.current.playVideo() : ytPlayerRef.current.pauseVideo()
  }, [isPlaying])

  // Volume
  useEffect(() => {
    if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(volume * 100)
  }, [volume])

  // Progress tracking
  useEffect(() => {
    if (!currentTrack) return
    const interval = setInterval(() => {
      if (ytPlayerRef.current?.getCurrentTime && currentTrack.duration) {
        const t = ytPlayerRef.current.getCurrentTime()
        setProgress(t / currentTrack.duration)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [currentTrack])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setProgress(val)
    if (ytPlayerRef.current?.seekTo && currentTrack) {
      ytPlayerRef.current.seekTo(val * currentTrack.duration, true)
    }
  }

  if (!currentTrack) return null

  const currentSeconds = Math.floor(progress * currentTrack.duration)

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

        {/* Progress */}
        <div className="w-full max-w-md flex items-center gap-2">
          <span className="text-zinc-500 text-xs w-8 text-right">{formatTime(currentSeconds)}</span>
          <input
            type="range" min={0} max={1} step={0.001}
            value={progress}
            onChange={handleSeek}
            className="flex-1 h-1 accent-green-500 cursor-pointer"
          />
          <span className="text-zinc-500 text-xs w-8">{formatTime(currentTrack.duration)}</span>
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