'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronDown, Mic2, Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'

function formatTime(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function LyricsFullscreen({ onClose }: { onClose: () => void }) {
  const {
    lyrics, progress, currentTrack, seekTo,
    isPlaying, setIsPlaying, playNext, playPrev,
  } = usePlayerStore()

  const safeProgress = isNaN(progress) || !isFinite(progress) ? 0 : progress
  const duration = currentTrack?.duration ?? 0
  const currentTime = safeProgress * duration

  const activeIndex = lyrics.reduce((acc, line, i) => {
    if (line.time <= currentTime) return i
    return acc
  }, 0)

  const activeRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!activeRef.current || !containerRef.current) return
    const container = containerRef.current
    const el = activeRef.current
    const targetScroll = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
    container.scrollTo({ top: targetScroll, behavior: 'smooth' })
  }, [activeIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(!isPlaying) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, isPlaying, setIsPlaying])

  if (!currentTrack) return null

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ratio = parseFloat(e.target.value)
    seekTo?.(ratio * duration)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 50%, #0d0d0d 100%)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 20% 50%, rgba(16,185,129,0.25) 0%, transparent 70%),
                       radial-gradient(ellipse 50% 40% at 80% 80%, rgba(139,92,246,0.15) 0%, transparent 60%)`,
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
        >
          <ChevronDown size={22} className="group-hover:translate-y-0.5 transition-transform" />
          <span className="text-sm font-medium tracking-wide">Close</span>
        </button>

        <div className="flex items-center gap-2 text-zinc-500">
          <Mic2 size={16} />
          <span className="text-xs uppercase tracking-widest font-semibold">Lyrics</span>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 overflow-hidden gap-12 px-8 pb-4">
        {/* Left — album art + track info (desktop only) */}
        <div className="hidden md:flex flex-col justify-center items-start w-72 shrink-0 gap-6">
          <div className="relative w-64 h-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 shrink-0">
            <Image
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
          </div>

          <div className="space-y-1 w-64">
            <p className="text-white font-bold text-xl leading-tight line-clamp-2">
              {currentTrack.title}
            </p>
            <p className="text-zinc-400 text-sm">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Right — lyrics */}
        <div className="flex-1 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, #0a0a0a, transparent)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #0a0a0a, transparent)' }}
          />

          {lyrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Mic2 size={40} className="text-zinc-700" />
              <p className="text-zinc-600 text-lg">No lyrics found</p>
              <p className="text-zinc-700 text-sm">for {currentTrack.title}</p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="h-full overflow-y-auto scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="pt-[35vh]" />

              {lyrics.map((line, i) => {
                const isActive = i === activeIndex
                const isPast = i < activeIndex

                return (
                  <button
                    key={i}
                    ref={isActive ? activeRef : null}
                    onClick={() => seekTo?.(line.time)}
                    className="block w-full text-left px-4 py-2 rounded-xl transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 hover:bg-white/5"
                    style={{
                      transform: isActive ? 'scale(1)' : 'scale(0.97)',
                      transformOrigin: 'left center',
                    }}
                  >
                    <span
                      className={`block font-bold leading-snug transition-all duration-300 ${
                        isActive
                          ? 'text-white text-3xl'
                          : isPast
                          ? 'text-zinc-600 text-2xl'
                          : 'text-zinc-500 text-2xl'
                      }`}
                      style={{ textShadow: isActive ? '0 0 40px rgba(16,185,129,0.3)' : 'none' }}
                    >
                      {line.text || '♪'}
                    </span>
                  </button>
                )
              })}

              <div className="pb-[35vh]" />
            </div>
          )}
        </div>
      </div>

      {/* ── Playback controls bar ── */}
      <div className="relative z-10 shrink-0 px-8 pb-8 pt-2 border-t border-zinc-800/50">
        {/* Track info — mobile only */}
        <div className="md:hidden flex items-center gap-3 mt-4 mb-5">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
            <Image src={currentTrack.thumbnail} alt="" fill className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{currentTrack.title}</p>
            <p className="text-zinc-400 text-xs truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Seek bar */}
        <div className="flex items-center gap-3 mt-4 mb-5 max-w-xl mx-auto w-full">
          <span className="text-zinc-500 text-xs tabular-nums w-9 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 h-1 group cursor-pointer">
            <div className="absolute inset-0 bg-zinc-700 rounded-full" />
            <div
              className="absolute inset-y-0 left-0 bg-green-500 rounded-full pointer-events-none transition-all duration-300"
              style={{ width: `${Math.min(safeProgress * 100, 100)}%` }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={safeProgress}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-zinc-500 text-xs tabular-nums w-9">
            {formatTime(duration)}
          </span>
        </div>

        {/* Prev / Play-Pause / Next */}
        <div className="flex items-center justify-center gap-10">
          <button
            onClick={playPrev}
            className="text-zinc-400 hover:text-white transition-colors hover:scale-110 active:scale-95"
          >
            <SkipBack size={28} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-black/40"
          >
            {isPlaying
              ? <Pause size={24} className="text-black fill-black" />
              : <Play size={24} className="text-black fill-black ml-1" />
            }
          </button>

          <button
            onClick={playNext}
            className="text-zinc-400 hover:text-white transition-colors hover:scale-110 active:scale-95"
          >
            <SkipForward size={28} />
          </button>
        </div>
      </div>
    </div>
  )
}