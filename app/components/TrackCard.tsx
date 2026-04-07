'use client'

import Image from 'next/image'
import { Play, MoreHorizontal } from 'lucide-react'
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
  const { setQueue, currentTrack, isPlaying } = usePlayerStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showRhythm, setShowRhythm] = useState(false)
  const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying

  const handlePlay = () => {
    if (trackList && trackIndex !== undefined) {
      setQueue(trackList, trackIndex)
    } else {
      setQueue([track], 0)
    }
  }

  const handlePlayRhythm = () => {
    // Make sure this track is playing first
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
          isCurrentlyPlaying ? 'bg-zinc-800/60' : ''
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
            <Play size={16} className="text-white fill-white" />
          </div>
          {isCurrentlyPlaying && (
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
          <p className={`text-sm font-medium truncate ${isCurrentlyPlaying ? 'text-green-400' : 'text-white'}`}>
            {track.title}
          </p>
          <p className="text-zinc-400 text-xs truncate">{track.artist}</p>
        </div>

        {/* Source badge */}
        <span className={`hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full shrink-0 ${
          track.source === 'youtube'
            ? 'bg-red-900/50 text-red-400'
            : 'bg-purple-900/50 text-purple-400'
        }`}>
          {track.source === 'youtube' ? 'YT' : 'DZ'}
        </span>

        {/* Duration */}
        <span className="hidden sm:block text-zinc-500 text-xs shrink-0">
          {formatDuration(track.duration)}
        </span>

        {/* ⋯ menu button — always visible on mobile, hover-only on desktop */}
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