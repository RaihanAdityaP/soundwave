'use client'

import Image from 'next/image'
import { Play, MoreHorizontal, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Track } from '@/types'
import { usePlayerStore } from '@/store/playerStore'
import TrackMenu from './TrackMenu'
import RhythmGame from './RhythmGame'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  track: Track
  trackList?: Track[]
  trackIndex?: number
  onRemove?: () => void
}

export default function TrackCard({ track, trackList, trackIndex, onRemove }: Props) {
  const { setQueue, currentTrack, isPlaying, resolving } = usePlayerStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showRhythm, setShowRhythm] = useState(false)
  const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying
  const isCurrentTrack = currentTrack?.id === track.id
  const isLoading = isCurrentTrack && resolving

  const handlePlay = () => {
    if (trackList && trackIndex !== undefined) {
      setQueue(trackList, trackIndex)
    } else {
      setQueue([track], 0)
    }
  }

  const handlePlayRhythm = () => {
    if (currentTrack?.id !== track.id) {
      if (trackList && trackIndex !== undefined) {
        setQueue(trackList, trackIndex)
      } else {
        setQueue([track], 0)
      }
    }
    setShowRhythm(true)
  }

  return (
    <>
      {showMenu && (
        <TrackMenu
          track={track}
          onClose={() => setShowMenu(false)}
          onRemove={onRemove}
          onPlayRhythm={handlePlayRhythm}
        />
      )}

      {showRhythm && (
        <RhythmGame onClose={() => setShowRhythm(false)} />
      )}

      <div
        className={`group flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-lg hover:bg-zinc-800 active:bg-zinc-800 transition-colors cursor-pointer ${
          isCurrentTrack ? 'bg-zinc-800/60' : ''
        }`}
        onClick={handlePlay}
      >
        {/* Thumbnail */}
        <div className="relative w-11 h-11 md:w-12 md:h-12 shrink-0">
          <Image
            src={track.thumbnail || '/placeholder.png'}
            alt={track.title}
            fill
            sizes="48px"
            className="object-cover rounded"
            unoptimized={track.source === 'deezer'}
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded">
              <Loader2 size={16} className="text-green-400 animate-spin" />
            </div>
          )}

          {/* Hover play icon */}
          {!isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
              <Play size={16} className="text-white fill-white" />
            </div>
          )}

          {/* Playing bars animation */}
          {isCurrentlyPlaying && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded">
              <span className="flex gap-0.75 items-end h-4">
                <span className="w-0.75 bg-green-400 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                <span className="w-0.75 bg-green-400 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                <span className="w-0.75 bg-green-400 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '75ms' }} />
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${
            isLoading ? 'text-zinc-400' : isCurrentlyPlaying ? 'text-green-400' : 'text-white'
          }`}>
            {track.title}
          </p>
          <p className="text-zinc-400 text-xs truncate">{track.artist}</p>
        </div>

        {/* Loading text */}
        {isLoading && (
          <span className="hidden sm:inline-flex text-xs text-zinc-500 shrink-0 animate-pulse">
            Loading…
          </span>
        )}

        {/* Source badge — logo asli Deezer/YouTube */}
        {!isLoading && (
          <span className="hidden sm:inline-flex items-center justify-center shrink-0">
            {track.source === 'youtube' ? (
              // YouTube logo
              <span className="flex items-center justify-center w-7 h-5 rounded overflow-hidden bg-transparent">
                <img
                  src="/youtube.png"
                  alt="YouTube"
                  width={28}
                  height={20}
                  className="object-contain w-7 h-5"
                  style={{ display: 'block' }}
                />
              </span>
            ) : (
              // Deezer logo
              <span className="flex items-center justify-center w-7 h-5 rounded overflow-hidden bg-transparent">
                <img
                  src="/deezer.png"
                  alt="Deezer"
                  width={28}
                  height={20}
                  className="object-contain w-7 h-5"
                  style={{ display: 'block' }}
                />
              </span>
            )}
          </span>
        )}

        {/* Duration */}
        <span className="hidden sm:block text-zinc-500 text-xs shrink-0">
          {formatDuration(track.duration)}
        </span>

        {/* ⋯ menu button */}
        <button
          onClick={e => { e.stopPropagation(); setShowMenu(true) }}
          className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors shrink-0 md:opacity-0 md:group-hover:opacity-100 touch-manipulation"
          style={{ minWidth: 36, minHeight: 36 }}
        >
          <MoreHorizontal size={17} />
        </button>
      </div>
    </>
  )
}